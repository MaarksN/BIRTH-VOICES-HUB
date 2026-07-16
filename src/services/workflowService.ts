import * as workflowRepository from '../repositories/workflowRepository.js';

export class NotFoundError extends Error {}

export function getWorkflow(tenantId: string, _version?: number) {
  // Mock finding specific version, we would normally query the specific version
  return workflowRepository.findWorkflowForTenant(tenantId);
}

export async function getWorkflowHistory(tenantId: string) {
  // In a fully normalized schema, we'd query a WorkflowVersion table.
  // Using JSON metadata for now as per rules to not alter Prisma schema
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) return [];
  const metadata = existing.metadata as any;
  return metadata?.history || [];
}

export async function saveWorkflow(tenantId: string, userId: string, data: { name?: string; nodes?: unknown; edges?: unknown, commitMessage?: string }) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);

  const metadata = existing?.metadata as any || {};
  const newVersion = (existing?.version || 0) + 1;

  const snapshot = {
    version: newVersion,
    timestamp: Date.now(),
    author: userId,
    message: data.commitMessage || `Update ${newVersion}`,
    nodes: data.nodes || existing?.nodes || [],
    edges: data.edges || existing?.edges || []
  };

  metadata.history = metadata.history || [];
  metadata.history.push(snapshot);

  return workflowRepository.upsertWorkflow(tenantId, userId, existing?.id ?? null, {
    ...data,
    metadata,
    version: newVersion
  });
}

export async function updateWorkflow(tenantId: string, userId: string, data: { name?: string; nodes?: unknown; edges?: unknown }) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado para atualização.');

  // Update without bumping major version, perhaps auto-save
  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, {
    name: data.name ?? existing.name,
    nodes: data.nodes ?? existing.nodes,
    edges: data.edges ?? existing.edges,
  });
}

export async function restoreWorkflowVersion(tenantId: string, userId: string, versionToRestore: number) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado.');

  const metadata = existing.metadata as any;
  const history = metadata?.history || [];
  const snapshot = history.find((h: any) => h.version === versionToRestore);

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
