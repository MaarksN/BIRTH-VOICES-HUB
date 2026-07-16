import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function findWorkflowForTenant(tenantId: string) {
  return prisma.workflow.findFirst({ where: { tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
}

export function upsertWorkflow(
  tenantId: string,
  userId: string,
  existingId: string | null,
  data: { name?: string; nodes?: unknown; edges?: unknown; metadata?: unknown; version?: number }
) {
  if (existingId) {
    return prisma.workflow.update({
      where: { id: existingId },
      data: {
        name: data.name ?? undefined,
        nodes: data.nodes !== undefined ? (data.nodes as Prisma.InputJsonValue) : undefined,
        edges: data.edges !== undefined ? (data.edges as Prisma.InputJsonValue) : undefined,
        metadata: data.metadata !== undefined ? (data.metadata as Prisma.InputJsonValue) : undefined,
        version: data.version ?? undefined,
        updatedBy: userId,
      },
    });
  }
  return prisma.workflow.create({
    data: {
      tenantId,
      userId,
      createdBy: userId,
      updatedBy: userId,
      name: data.name || "Default Workflow",
      nodes: (data.nodes ?? []) as Prisma.InputJsonValue,
      edges: (data.edges ?? []) as Prisma.InputJsonValue,
      metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      version: data.version ?? 1,
    },
  });
}

export function deleteWorkflow(id: string) {
  return prisma.workflow.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function findWorkflowById(id: string) {
  return prisma.workflow.findUnique({ where: { id } });
}

// Optimistic concurrency: only applies the metadata write if `version` still matches what the
// caller last read. Returns the affected row count so callers can detect a lost-update race
// (two collaborators editing locks/comments on the same workflow at once) and retry.
export async function updateMetadataIfVersion(id: string, expectedVersion: number, userId: string, metadata: unknown) {
  const { count } = await prisma.workflow.updateMany({
    where: { id, version: expectedVersion },
    data: {
      metadata: metadata as Prisma.InputJsonValue,
      version: { increment: 1 },
      updatedBy: userId,
    },
  });
  return count;
}
