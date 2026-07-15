import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function findWorkflowForTenant(tenantId: string) {
  return prisma.workflow.findFirst({ where: { tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
}

export function upsertWorkflow(
  tenantId: string,
  userId: string,
  existingId: string | null,
  data: { name?: string; nodes?: unknown; edges?: unknown }
) {
  if (existingId) {
    return prisma.workflow.update({
      where: { id: existingId },
      data: {
        name: data.name ?? undefined,
        nodes: data.nodes as Prisma.InputJsonValue,
        edges: data.edges as Prisma.InputJsonValue,
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
      name: data.name || 'Default Workflow',
      nodes: (data.nodes ?? []) as Prisma.InputJsonValue,
      edges: (data.edges ?? []) as Prisma.InputJsonValue,
    },
  });
}

export function deleteWorkflow(id: string) {
  return prisma.workflow.update({ where: { id }, data: { deletedAt: new Date() } });
}
