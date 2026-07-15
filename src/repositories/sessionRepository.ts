import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function listSessionsForUser(tenantId: string, userId: string) {
  return prisma.session.findMany({ where: { tenantId, userId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
}

export function createSession(tenantId: string, userId: string, data: { agentId?: string; channel?: string; metadata?: unknown }) {
  return prisma.session.create({
    data: {
      tenantId,
      userId,
      agentId: data.agentId || 'default_catarina',
      channel: data.channel || 'WebChat',
      status: 'active',
      metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export function findSessionForUser(id: string, tenantId: string, userId: string) {
  return prisma.session.findFirst({ where: { id, tenantId, userId, deletedAt: null } });
}

export function updateSession(id: string, data: { status?: string; metadata?: Prisma.InputJsonValue }) {
  return prisma.session.update({ where: { id }, data });
}

export function deleteSession(id: string) {
  return prisma.session.update({ where: { id }, data: { deletedAt: new Date() } });
}
