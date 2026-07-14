import { prisma } from '../lib/prisma.js';

export function listMetricsForUser(tenantId: string, userId: string) {
  return prisma.metric.findMany({ where: { tenantId, userId }, orderBy: { timestamp: 'desc' }, take: 1000 });
}

export function createMetric(tenantId: string, userId: string, data: { name: string; value: number; tags?: unknown }) {
  return prisma.metric.create({
    data: {
      tenantId,
      userId,
      name: data.name,
      value: data.value,
      tags: (data.tags ?? {}) as any,
    },
  });
}

export function deleteMetricsForUser(tenantId: string, userId: string) {
  return prisma.metric.deleteMany({ where: { tenantId, userId } });
}
