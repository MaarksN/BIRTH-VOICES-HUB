import type { Prisma } from '@prisma/client';
import type { StudioEdge, StudioNode, ValidationIssue } from '../../lib/studio/types.js';
import * as workflowRepository from '../repositories/workflowRepository.js';
import { logger } from '../lib/logger.js';

export type RuntimeProvider = 'GoogleGemini' | 'OpenAI' | 'Claude';
export type RuntimeNodeType = 'start' | 'llm' | 'prompt' | 'question' | 'condition' | 'switch' | 'memory' | 'end';

type RuntimeConfig = Record<string, Prisma.JsonValue>;

interface RuntimeNode extends Record<string, Prisma.JsonValue> {
  id: string;
  type: RuntimeNodeType;
  config: RuntimeConfig;
}

interface RuntimeEdge extends Record<string, Prisma.JsonValue> {
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null;
  isFallback: boolean;
  priority: number;
}

/**
 * This snapshot is persisted inside Session.metadata, so its public type deliberately satisfies
 * Prisma.JsonObject. Keeping the runtime state JSON-safe prevents test-only casts from hiding a
 * production persistence mismatch and makes the session snapshot portable across workers.
 */
export interface WorkflowRuntimeState extends Record<string, Prisma.JsonValue> {
  workflowId: string;
  version: number;
  currentNodeId: string | null;
  variables: Record<string, string>;
  preferredProvider: RuntimeProvider;
  retries: Record<string, number>;
  ended: boolean;
  nodes: RuntimeNode[];
  edges: RuntimeEdge[];
}

export interface PreparedWorkflowTurn {
  state: WorkflowRuntimeState;
  mode: 'llm' | 'direct';
  systemInstruction?: string;
  preferredProvider?: RuntimeProvider;
  directReply?: string;
  nextQuestion?: string;
  shouldEnd: boolean;
}

const SUPPORTED_TYPES = new Set<RuntimeNodeType>([
  'start',
  'llm',
  'prompt',
  'question',
  'condition',
  'switch',
  'memory',
  'end',
]);

const UNSUPPORTED_REASON: Partial<Record<string, string>> = {
  voice: 'A telefonia de produção usa Twilio <Say>/<Gather>; o seletor de voz do Studio ainda não controla esse caminho.',
  knowledge: 'O nó Knowledge ainda não está ligado a uma base RAG tenant-scoped no runtime de telefonia.',
  tool: 'O nó Tool não é ativado sem um executor allowlisted/tenant-scoped para evitar SSRF e vazamento de credenciais.',
  human_handoff: 'A transferência humana ainda não possui bridge de telefonia validada para produção.',
};

function asRecord(value: unknown): RuntimeConfig {
  // Workflow config is persisted in a Prisma Json column before it reaches the runtime. This cast
  // narrows that already-validated JSON boundary; the runtime never accepts arbitrary JS objects
  // directly from request bodies here.
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RuntimeConfig
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isTruthy(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

function toStudioGraph(nodes: unknown, edges: unknown): { nodes: StudioNode[]; edges: StudioEdge[] } {
  return {
    nodes: Array.isArray(nodes) ? nodes as StudioNode[] : [],
    edges: Array.isArray(edges) ? edges as StudioEdge[] : [],
  };
}

function outgoingFor(edges: StudioEdge[], nodeId: string): StudioEdge[] {
  return edges.filter((edge) => edge.source === nodeId);
}

function branchHandles(edges: StudioEdge[], nodeId: string): Set<string> {
  return new Set(
    outgoingFor(edges, nodeId)
      .map((edge) => edge.sourceHandle)
      .filter((handle): handle is string => typeof handle === 'string' && handle.length > 0),
  );
}

export function mapRuntimeProvider(value: unknown): RuntimeProvider | null {
  const normalized = asString(value).toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'gemini' || normalized === 'googlegemini') return 'GoogleGemini';
  if (normalized === 'openai') return 'OpenAI';
  if (normalized === 'claude' || normalized === 'anthropic') return 'Claude';
  return null;
}

/**
 * Server-side capability gate for the runtime, complementary to ValidationEngine's graph-shape
 * validation. A workflow may be visually valid yet still contain a node that the production
 * telephony executor cannot honestly execute. Those graphs fail closed at publish time instead
 * of being marked active and silently ignored during a real call.
 */
export function validateRuntimeCompatibility(nodes: StudioNode[], edges: StudioEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const node of nodes) {
    const type = node.type;
    if (!type || !SUPPORTED_TYPES.has(type as RuntimeNodeType)) {
      const reason = type ? UNSUPPORTED_REASON[type] : 'O nó não possui um tipo executável.';
      issues.push({
        id: `err-runtime-unsupported-${node.id}`,
        nodeId: node.id,
        type: 'error',
        message: `Este nó ainda não pode ser publicado no runtime de telefonia. ${reason ?? 'Executor de produção indisponível.'}`,
      });
      continue;
    }

    const outgoing = outgoingFor(edges, node.id);
    if (!['condition', 'switch', 'question'].includes(type) && type !== 'end' && outgoing.length > 1) {
      issues.push({
        id: `err-runtime-fanout-${node.id}`,
        nodeId: node.id,
        type: 'error',
        message: 'O runtime exige uma única saída para nós não condicionais; fan-out paralelo ainda não é executado de forma determinística.',
      });
    }

    const config = asRecord(node.data.config);

    if (type === 'llm' && !mapRuntimeProvider(config.provider)) {
      issues.push({
        id: `err-runtime-provider-${node.id}`,
        nodeId: node.id,
        type: 'error',
        message: 'Provedor LLM não suportado pelo runtime. Use Gemini, OpenAI ou Claude.',
      });
    }

    if (type === 'condition') {
      if (isTruthy(config.naturalLanguageCheck)) {
        issues.push({
          id: `err-runtime-nl-condition-${node.id}`,
          nodeId: node.id,
          type: 'error',
          message: 'Condição em linguagem natural ainda não é executável. Use uma variável de sessão e operador determinístico.',
        });
      }

      const operator = asString(config.operator).toLowerCase() || 'equals';
      if (!['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists', 'regex'].includes(operator)) {
        issues.push({
          id: `err-runtime-condition-operator-${node.id}`,
          nodeId: node.id,
          type: 'error',
          message: `Operador de condição '${operator}' não é suportado pelo runtime.`,
        });
      }

      const handles = branchHandles(edges, node.id);
      if (!handles.has('out-0') || !handles.has('out-1')) {
        issues.push({
          id: `err-runtime-condition-edges-${node.id}`,
          nodeId: node.id,
          type: 'error',
          message: 'Condition precisa conectar out-0 (verdadeiro) e out-1 (falso/fallback).',
        });
      }
    }

    if (type === 'question') {
      const handles = branchHandles(edges, node.id);
      if (!handles.has('out-0') || !handles.has('out-1')) {
        issues.push({
          id: `err-runtime-question-edges-${node.id}`,
          nodeId: node.id,
          type: 'error',
          message: 'Question precisa conectar out-0 (resposta válida) e out-1 (tentativas esgotadas).',
        });
      }

      const validationRegex = asString(config.validationRegex);
      if (validationRegex) {
        try {
          new RegExp(validationRegex, 'i');
        } catch {
          issues.push({
            id: `err-runtime-question-regex-${node.id}`,
            nodeId: node.id,
            type: 'error',
            message: 'A expressão regular configurada na Question é inválida.',
          });
        }
      }
    }

    if (type === 'switch') {
      const outgoingSwitch = outgoingFor(edges, node.id);
      const invalidHandle = outgoingSwitch.find(
        (edge) => !edge.data?.isFallback && !(typeof edge.sourceHandle === 'string' && /^out-\d+$/.test(edge.sourceHandle)),
      );
      if (invalidHandle) {
        issues.push({
          id: `err-runtime-switch-edge-${invalidHandle.id}`,
          nodeId: node.id,
          edgeId: invalidHandle.id,
          type: 'error',
          message: 'Cada saída do Switch precisa usar um sourceHandle out-N ou ser marcada explicitamente como fallback.',
        });
      }
    }
  }

  return issues;
}

function compileNodes(nodes: StudioNode[]): RuntimeNode[] {
  return nodes
    .filter((node): node is StudioNode & { type: RuntimeNodeType } => Boolean(node.type && SUPPORTED_TYPES.has(node.type as RuntimeNodeType)))
    .map((node) => ({ id: node.id, type: node.type, config: asRecord(node.data.config) }));
}

function compileEdges(edges: StudioEdge[]): RuntimeEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: typeof edge.sourceHandle === 'string' ? edge.sourceHandle : null,
    isFallback: edge.data?.isFallback === true,
    priority: typeof edge.data?.priority === 'number' ? edge.data.priority : 0,
  }));
}

function nodeById(state: WorkflowRuntimeState, nodeId: string | null): RuntimeNode | null {
  if (!nodeId) return null;
  return state.nodes.find((node) => node.id === nodeId) ?? null;
}

function orderedOutgoing(state: WorkflowRuntimeState, nodeId: string): RuntimeEdge[] {
  return state.edges
    .filter((edge) => edge.source === nodeId)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

function selectHandle(state: WorkflowRuntimeState, nodeId: string, handle: string): RuntimeEdge | null {
  const outgoing = orderedOutgoing(state, nodeId);
  return outgoing.find((edge) => edge.sourceHandle === handle)
    ?? outgoing.find((edge) => edge.isFallback)
    ?? null;
}

function selectDefaultEdge(state: WorkflowRuntimeState, nodeId: string): RuntimeEdge | null {
  return orderedOutgoing(state, nodeId)[0] ?? null;
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? '');
}

function normalizeComparable(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function evaluateCondition(config: RuntimeConfig, variables: Record<string, string>): boolean {
  const variable = asString(config.variable);
  const operator = asString(config.operator).toLowerCase() || 'equals';
  const actual = variables[variable] ?? '';
  const expected = renderTemplate(asString(config.value), variables);
  const a = normalizeComparable(actual);
  const b = normalizeComparable(expected);

  switch (operator) {
    case 'equals': return a === b;
    case 'not_equals': return a !== b;
    case 'contains': return a.includes(b);
    case 'not_contains': return !a.includes(b);
    case 'exists': return actual.trim().length > 0;
    case 'not_exists': return actual.trim().length === 0;
    case 'regex': {
      try {
        return new RegExp(expected, 'i').test(actual);
      } catch {
        return false;
      }
    }
    default: return false;
  }
}

function applyMemoryNode(config: RuntimeConfig, variables: Record<string, string>): void {
  const operation = asString(config.operation).toLowerCase();
  const variableName = asString(config.variableName);

  if (operation === 'reset' || operation === 'reset session') {
    for (const key of Object.keys(variables)) delete variables[key];
    return;
  }

  if (!variableName) return;

  if (operation === 'delete variable' || operation === 'remove variable' || operation === 'delete') {
    delete variables[variableName];
    return;
  }

  variables[variableName] = renderTemplate(asString(config.variableValue), variables);
}

function routeSwitch(state: WorkflowRuntimeState, node: RuntimeNode): RuntimeEdge | null {
  const variableName = asString(node.config.variableToCheck);
  const actual = normalizeComparable(state.variables[variableName] ?? '');
  const paths = Object.entries(node.config)
    .map(([key, value]) => {
      const match = /^path(\d+)$/.exec(key);
      return match ? { index: Number(match[1]), value: asString(value) } : null;
    })
    .filter((entry): entry is { index: number; value: string } => entry !== null)
    .sort((a, b) => a.index - b.index);

  const matched = paths.find((entry) => normalizeComparable(entry.value) === actual);
  if (matched) return selectHandle(state, node.id, `out-${matched.index}`);

  return orderedOutgoing(state, node.id).find((edge) => edge.isFallback) ?? null;
}

function advanceUntilInteraction(state: WorkflowRuntimeState, fromNodeId: string | null): WorkflowRuntimeState {
  let currentId = fromNodeId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      state.ended = true;
      state.currentNodeId = null;
      logger.error('Workflow runtime stopped an unexpected cycle', { workflowId: state.workflowId, nodeId: currentId });
      return state;
    }
    visited.add(currentId);

    const node = nodeById(state, currentId);
    if (!node) {
      state.ended = true;
      state.currentNodeId = null;
      logger.error('Workflow runtime could not resolve node', { workflowId: state.workflowId, nodeId: currentId });
      return state;
    }

    if (node.type === 'prompt' || node.type === 'question') {
      state.currentNodeId = node.id;
      return state;
    }

    if (node.type === 'end') {
      state.ended = true;
      state.currentNodeId = node.id;
      return state;
    }

    if (node.type === 'llm') {
      const provider = mapRuntimeProvider(node.config.provider);
      if (provider) state.preferredProvider = provider;
      currentId = selectDefaultEdge(state, node.id)?.target ?? null;
      continue;
    }

    if (node.type === 'memory') {
      applyMemoryNode(node.config, state.variables);
      currentId = selectDefaultEdge(state, node.id)?.target ?? null;
      continue;
    }

    if (node.type === 'condition') {
      const matched = evaluateCondition(node.config, state.variables);
      currentId = selectHandle(state, node.id, matched ? 'out-0' : 'out-1')?.target ?? null;
      continue;
    }

    if (node.type === 'switch') {
      currentId = routeSwitch(state, node)?.target ?? null;
      continue;
    }

    currentId = selectDefaultEdge(state, node.id)?.target ?? null;
  }

  state.ended = true;
  state.currentNodeId = null;
  return state;
}

function cloneState(state: WorkflowRuntimeState): WorkflowRuntimeState {
  return structuredClone(state);
}

function advancePastCurrent(state: WorkflowRuntimeState, current: RuntimeNode, handle?: string): WorkflowRuntimeState {
  const edge = handle ? selectHandle(state, current.id, handle) : selectDefaultEdge(state, current.id);
  return advanceUntilInteraction(state, edge?.target ?? null);
}

function questionText(state: WorkflowRuntimeState): string | undefined {
  const current = nodeById(state, state.currentNodeId);
  if (!current || current.type !== 'question') return undefined;
  const text = renderTemplate(asString(current.config.questionText), state.variables);
  return text || undefined;
}

function closingMessage(state: WorkflowRuntimeState): string {
  const current = nodeById(state, state.currentNodeId);
  const configured = current?.type === 'end' ? asString(current.config.closingMessage) : '';
  return configured || 'Obrigado pelo contato. Até logo.';
}

export async function initializeWorkflowRuntime(
  tenantId: string,
  initialVariables: Record<string, unknown> = {},
): Promise<WorkflowRuntimeState | null> {
  const workflow = await workflowRepository.findActiveWorkflowForTenant(tenantId);
  if (!workflow) return null;

  const { nodes, edges } = toStudioGraph(workflow.nodes, workflow.edges);
  const runtimeIssues = validateRuntimeCompatibility(nodes, edges);
  if (runtimeIssues.length > 0) {
    logger.error('Active workflow is not runtime-compatible; refusing to execute it', {
      tenantId,
      workflowId: workflow.id,
      issueIds: runtimeIssues.map((issue) => issue.id),
    });
    return null;
  }

  const start = nodes.find((node) => node.type === 'start');
  if (!start) return null;

  const state: WorkflowRuntimeState = {
    workflowId: workflow.id,
    version: workflow.version,
    currentNodeId: start.id,
    variables: Object.fromEntries(
      Object.entries(initialVariables)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    ),
    preferredProvider: 'GoogleGemini',
    retries: {},
    ended: false,
    nodes: compileNodes(nodes),
    edges: compileEdges(edges),
  };

  return advanceUntilInteraction(state, start.id);
}

export function getWorkflowOpeningQuestion(state: WorkflowRuntimeState | null): string | null {
  if (!state || state.ended) return null;
  return questionText(state) ?? null;
}

export function prepareWorkflowTurn(state: WorkflowRuntimeState, userText: string): PreparedWorkflowTurn {
  const next = cloneState(state);
  next.variables.lastUserText = userText;

  if (next.ended) {
    return { state: next, mode: 'direct', directReply: closingMessage(next), shouldEnd: true };
  }

  const current = nodeById(next, next.currentNodeId);
  if (!current) {
    next.ended = true;
    return { state: next, mode: 'direct', directReply: closingMessage(next), shouldEnd: true };
  }

  if (current.type === 'question') {
    const regexText = asString(current.config.validationRegex);
    let valid = true;
    if (regexText) {
      try {
        valid = new RegExp(regexText, 'i').test(userText);
      } catch {
        valid = false;
      }
    }

    if (!valid) {
      const attempts = (next.retries[current.id] ?? 0) + 1;
      next.retries[current.id] = attempts;
      const maxRetryCount = Math.max(0, asNumber(current.config.maxRetryCount, 3));
      const fallbackPrompt = renderTemplate(
        asString(current.config.fallbackPrompt) || asString(current.config.questionText) || 'Não entendi. Pode repetir?',
        next.variables,
      );

      if (attempts <= maxRetryCount) {
        return { state: next, mode: 'direct', directReply: fallbackPrompt, shouldEnd: false };
      }

      delete next.retries[current.id];
      advancePastCurrent(next, current, 'out-1');
      const nextQuestion = questionText(next);
      return {
        state: next,
        mode: 'direct',
        directReply: [fallbackPrompt, nextQuestion].filter(Boolean).join(' '),
        shouldEnd: next.ended,
      };
    }

    const variableToSave = asString(current.config.variableToSave);
    if (variableToSave) next.variables[variableToSave] = userText;
    delete next.retries[current.id];
    advancePastCurrent(next, current, 'out-0');

    const afterQuestion = nodeById(next, next.currentNodeId);
    if (afterQuestion?.type === 'prompt') {
      const instruction = renderTemplate(asString(afterQuestion.config.promptText), next.variables);
      advancePastCurrent(next, afterQuestion);
      return {
        state: next,
        mode: 'llm',
        systemInstruction: instruction,
        preferredProvider: next.preferredProvider,
        nextQuestion: questionText(next),
        shouldEnd: next.ended,
      };
    }

    const nextQuestion = questionText(next);
    return {
      state: next,
      mode: 'direct',
      directReply: nextQuestion ?? (next.ended ? closingMessage(next) : 'Obrigado. Pode continuar.'),
      shouldEnd: next.ended,
    };
  }

  if (current.type === 'prompt') {
    const instruction = renderTemplate(asString(current.config.promptText), next.variables);
    advancePastCurrent(next, current);
    return {
      state: next,
      mode: 'llm',
      systemInstruction: instruction,
      preferredProvider: next.preferredProvider,
      nextQuestion: questionText(next),
      shouldEnd: next.ended,
    };
  }

  next.ended = true;
  return { state: next, mode: 'direct', directReply: closingMessage(next), shouldEnd: true };
}
