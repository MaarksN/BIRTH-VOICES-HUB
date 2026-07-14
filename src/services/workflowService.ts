import * as workflowRepository from '../repositories/workflowRepository.js';

export class NotFoundError extends Error {}

export function getWorkflow(tenantId: string) {
  return workflowRepository.findWorkflowForTenant(tenantId);
}

export async function saveWorkflow(tenantId: string, userId: string, data: { name?: string; nodes?: unknown; edges?: unknown }) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  return workflowRepository.upsertWorkflow(tenantId, userId, existing?.id ?? null, data);
}

export async function updateWorkflow(tenantId: string, userId: string, data: { name?: string; nodes?: unknown; edges?: unknown }) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado para atualização.');
  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, {
    name: data.name ?? existing.name,
    nodes: data.nodes ?? existing.nodes,
    edges: data.edges ?? existing.edges,
  });
}

export async function removeWorkflow(tenantId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Nenhum fluxo encontrado para exclusão.');
  await workflowRepository.deleteWorkflow(existing.id);
  return existing;
}
