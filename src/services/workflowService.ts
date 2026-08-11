import * as workflowRepository from '../repositories/workflowRepository.js';
import { validationEngine } from '../../lib/studio/ValidationEngine.js';
import type { StudioNode, StudioEdge, ValidationIssue } from '../../lib/studio/types.js';

export class NotFoundError extends Error {}

/**
 * Thrown by `publishWorkflow` when the workflow's nodes/edges don't pass `ValidationEngine`.
 * This is the ONLY error type an "activate/publish" caller should ever see for a rejected
 * workflow — there is no other successful code path that marks a workflow `status: 'active'`.
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
 * type level they're `unknown` until read back. Studio (this agent's domain) is the only writer
 * of that column, so it's safe to assume the shape matches StudioNode[]/StudioEdge[] — but we
 * still guard against non-array garbage (e.g. a row created before this column existed, or a
 * manual DB edit) rather than letting ValidationEngine throw on `.filter`/`.forEach`.
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
 * Shape of the Workflow.metadata Prisma `Json` field. There's no dedicated
 * WorkflowVersion table (per the "don't alter the Prisma schema" constraint
 * noted below), so version history is kept inline here.
 */
export interface WorkflowMetadata {
  history?: WorkflowVersionSnapshot[];
  [key: string]: unknown;
}

export function getWorkflow(tenantId: string, _version?: number) {
  // Mock finding specific version, we would normally query the specific version
  return workflowRepository.findWorkflowForTenant(tenantId);
}

export async function getWorkflowHistory(tenantId: string) {
  // In a fully normalized schema, we'd query a WorkflowVersion table.
  // Using JSON metadata for now as per rules to not alter Prisma schema
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

  // A committed save is, by definition, unvalidated new content: even if the workflow was
  // previously `active` (published), this write must downgrade it back to `draft` so the runtime
  // never picks up nodes/edges that skipped ValidationEngine. Re-activation only happens through
  // `publishWorkflow` below, which is the sole path allowed to set status: 'active'.
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

  // Any structural edit (nodes/edges) invalidates a prior publish for the same reason as
  // saveWorkflow above: the row must never stay `active` while carrying content that hasn't
  // been through ValidationEngine since the edit. A metadata-only update (e.g. rename) leaves
  // status untouched (`undefined` here means "don't change it", per upsertWorkflow's contract).
  const structuralChange = data.nodes !== undefined || data.edges !== undefined;

  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, {
    name: data.name ?? existing.name,
    nodes: data.nodes ?? existing.nodes,
    edges: data.edges ?? existing.edges,
    status: structuralChange ? 'draft' : undefined,
  });
}

/**
 * The single gate a workflow must pass through to become `active` (i.e. eligible for the voice
 * runtime to execute — see `workflowRepository.findActiveWorkflowForTenant`). Re-reads the
 * tenant's current workflow (never trusts nodes/edges passed by the caller) and runs the same
 * `ValidationEngine` the Studio canvas uses client-side, so a stripped-down/forged request body
 * can't skip validation that the UI happens to enforce only cosmetically.
 */
export async function publishWorkflow(tenantId: string, userId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Nenhum fluxo encontrado para publicar.');

  const { nodes, edges } = toStudioGraph(existing.nodes, existing.edges);
  const result = validationEngine.validate(nodes, edges);

  if (!result.isValid) {
    throw new ValidationFailedError(result.issues);
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
    // In a real app we fetch the specific workflow by id, here we fetch the tenant's single workflow for mockup
    const existing = await workflowRepository.findWorkflowForTenant(tenantId);
    if (!existing) throw new NotFoundError('Workflow de origem não encontrado.');

    return workflowRepository.upsertWorkflow(tenantId, userId, null, {
        name: `${existing.name} (Cópia)`,
        nodes: existing.nodes,
        edges: existing.edges
    });
}
