import * as workflowRepository from '../repositories/workflowRepository.js';
import { validationEngine } from '../../lib/studio/ValidationEngine.js';
import { validateRuntimeCompatibility } from './workflowRuntimeService.js';
import type { StudioNode, StudioEdge, ValidationIssue } from '../../lib/studio/types.js';

export class NotFoundError extends Error {}

/**
 * Thrown by `publishWorkflow` when the workflow's nodes/edges don't pass the visual graph
 * validator or the production-runtime capability gate. This is the ONLY error type an
 * "activate/publish" caller should ever see for a rejected workflow — there is no other
 * successful code path that marks a workflow `status: 'active'`.
 */
export class ValidationFailedError extends Error {
  issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super('O fluxo contém erros de validação e não pode ser publicado/ativado.');
    this.name = 'ValidationFailedError';
    this.issues = issues;
  }
}

/**
 * `Workflow.nodes`/`edges` are persisted as Prisma `Json` (see prisma/schema.prisma), so at the
 * type level they're `unknown` until read back. Studio is the only normal writer of that column,
 * but we still guard against non-array garbage (old rows/manual DB edits) rather than letting
 * validators throw on `.filter`/`.forEach`.
 */
function toStudioGraph(nodes: unknown, edges: unknown): { nodes: StudioNode[]; edges: StudioEdge[] } {
  return {
    nodes: Array.isArray(nodes) ? (nodes as StudioNode[]) : [],
    edges: Array.isArray(edges) ? (edges as StudioEdge[]) : [],
  };
}

/** A single saved revision of a workflow, appended to `WorkflowMetadata.history` on every save. */
export interface WorkflowVersionSnapshot {
  version: number;
  timestamp: number;
  author: string;
  message: string;
  nodes: unknown;
  edges: unknown;
}

/**
 * Shape of the Workflow.metadata Prisma `Json` field. There's no dedicated WorkflowVersion table,
 * so version history is kept inline here.
 */
export interface WorkflowMetadata {
  history?: WorkflowVersionSnapshot[];
  [key: string]: unknown;
}

export function getWorkflow(tenantId: string, _version?: number) {
  return workflowRepository.findWorkflowForTenant(tenantId);
}

export async function getWorkflowHistory(tenantId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) return [];
  const metadata = existing.metadata as unknown as WorkflowMetadata;
  return metadata?.history || [];
}

export async function saveWorkflow(tenantId: string, userId: string, data: { name?: string; nodes?: unknown; edges?: unknown, commitMessage?: string }) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);

  const metadata = (existing?.metadata as unknown as WorkflowMetadata) || {};
  const newVersion = (existing?.version || 0) + 1;

  const snapshot: WorkflowVersionSnapshot = {
    version: newVersion,
    timestamp: Date.now(),
    author: userId,
    message: data.commitMessage || `Update ${newVersion}`,
    nodes: data.nodes || existing?.nodes || [],
    edges: data.edges || existing?.edges || []
  };

  metadata.history = metadata.history || [];
  metadata.history.push(snapshot);

  // Every structural save is unvalidated new content. Even if the row used to be active, the
  // write goes back to draft and must cross publishWorkflow again before production can see it.
  return workflowRepository.upsertWorkflow(tenantId, userId, existing?.id ?? null, {
    ...data,
    metadata,
    version: newVersion,
    status: 'draft',
  });
}

export async function updateWorkflow(tenantId: string, userId: string, data: { name?: string; nodes?: unknown; edges?: unknown }) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado para atualização.');

  const structuralChange = data.nodes !== undefined || data.edges !== undefined;

  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, {
    name: data.name ?? existing.name,
    nodes: data.nodes ?? existing.nodes,
    edges: data.edges ?? existing.edges,
    status: structuralChange ? 'draft' : undefined,
  });
}

/**
 * The single gate a workflow must pass through to become `active`.
 *
 * Two independent validations happen server-side against the persisted graph:
 * 1. `ValidationEngine` checks graph correctness (start node, reachability, dead ends, cycles,
 *    required node configuration, etc.).
 * 2. `validateRuntimeCompatibility` checks whether the production telephony runtime can honestly
 *    execute every node/branch. A visually valid graph is NOT activated if it depends on a node
 *    whose runtime executor does not exist yet.
 *
 * This prevents the Studio from advertising a successful publish for a graph that real calls
 * would silently ignore.
 */
export async function publishWorkflow(tenantId: string, userId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Nenhum fluxo encontrado para publicar.');

  const { nodes, edges } = toStudioGraph(existing.nodes, existing.edges);
  const graphResult = validationEngine.validate(nodes, edges);
  const runtimeIssues = validateRuntimeCompatibility(nodes, edges);
  const issues = [...graphResult.issues, ...runtimeIssues];

  if (!graphResult.isValid || runtimeIssues.some((issue) => issue.type === 'error')) {
    throw new ValidationFailedError(issues);
  }

  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, { status: 'active' });
}

export async function restoreWorkflowVersion(tenantId: string, userId: string, versionToRestore: number) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado.');

  const metadata = existing.metadata as unknown as WorkflowMetadata;
  const history = metadata?.history || [];
  const snapshot = history.find((h) => h.version === versionToRestore);

  if (!snapshot) throw new NotFoundError('Versão não encontrada.');

  return saveWorkflow(tenantId, userId, {
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    commitMessage: `Restaurado para a versão ${versionToRestore}`
  });
}

export async function removeWorkflow(tenantId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Nenhum fluxo encontrado para exclusão.');
  await workflowRepository.deleteWorkflow(existing.id);
  return existing;
}

export async function duplicateWorkflow(tenantId: string, userId: string, _sourceWorkflowId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow de origem não encontrado.');

  return workflowRepository.upsertWorkflow(tenantId, userId, null, {
    name: `${existing.name} (Cópia)`,
    nodes: existing.nodes,
    edges: existing.edges
  });
}
