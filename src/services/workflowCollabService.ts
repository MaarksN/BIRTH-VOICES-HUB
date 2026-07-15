import * as workflowRepository from '../repositories/workflowRepository.js';
import { NotFoundError } from './workflowService.js';

// Managing transient collab state (optimistic locking / comments) via JSONB metadata
// In a full implementation, Redis or a dedicated table is preferred, but per rule: Do not alter Prisma.

export async function addComment(tenantId: string, userId: string, nodeId: string, text: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado.');

  const metadata = existing.metadata as any || {};
  metadata.comments = metadata.comments || [];

  const comment = {
    id: `cmt_${crypto.randomUUID()}`,
    nodeId,
    userId,
    text,
    timestamp: Date.now(),
    resolved: false
  };

  metadata.comments.push(comment);

  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, {
    metadata
  });
}

export async function resolveComment(tenantId: string, userId: string, commentId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado.');

  const metadata = existing.metadata as any || {};
  const comments = metadata.comments || [];

  const comment = comments.find((c: any) => c.id === commentId);
  if (comment) {
      comment.resolved = true;
      comment.resolvedBy = userId;
      comment.resolvedAt = Date.now();
  }

  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, {
    metadata
  });
}

export async function lockNode(tenantId: string, userId: string, nodeId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado.');

  const metadata = existing.metadata as any || {};
  metadata.locks = metadata.locks || {};

  if (metadata.locks[nodeId] && metadata.locks[nodeId].userId !== userId && (Date.now() - metadata.locks[nodeId].timestamp < 300000)) {
     throw new Error('Nó atualmente bloqueado por outro usuário.');
  }

  metadata.locks[nodeId] = { userId, timestamp: Date.now() };

  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, {
    metadata
  });
}

export async function unlockNode(tenantId: string, userId: string, nodeId: string) {
  const existing = await workflowRepository.findWorkflowForTenant(tenantId);
  if (!existing) throw new NotFoundError('Workflow não encontrado.');

  const metadata = existing.metadata as any || {};
  metadata.locks = metadata.locks || {};

  if (metadata.locks[nodeId] && metadata.locks[nodeId].userId === userId) {
      delete metadata.locks[nodeId];
  }

  return workflowRepository.upsertWorkflow(tenantId, userId, existing.id, {
    metadata
  });
}
