import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function createAuditLog(data: { tenantId?: string; userId: string; action: string; details: unknown }) {
  return prisma.auditLog.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.action,
      details: (data.details ?? {}) as Prisma.InputJsonValue,
    },
  });
}
