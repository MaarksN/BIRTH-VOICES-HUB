import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function listAgentsForTenant(tenantId: string) {
  return prisma.agent.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
}

export function createAgent(tenantId: string, userId: string, data: { name: string; model: string; configuration?: unknown }) {
  return prisma.agent.create({
    data: {
      tenantId,
      userId,
      name: data.name,
      model: data.model,
      configuration: (data.configuration ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export function deleteAgentForTenant(id: string, tenantId: string) {
  return prisma.agent.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } });
}
