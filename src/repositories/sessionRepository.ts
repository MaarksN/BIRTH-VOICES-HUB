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

// Phone calls have no logged-in user (userId is null) — the caller is authenticated by the
// Twilio request signature, not a JWT, and tenant scoping comes from the resolved Agent instead.
export function createPhoneSession(tenantId: string, agentId: string, metadata: unknown) {
  return prisma.session.create({
    data: {
      tenantId,
      userId: null,
      agentId,
      channel: 'phone',
      status: 'active',
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export function findSessionById(id: string) {
  return prisma.session.findFirst({ where: { id, deletedAt: null } });
}

// Twilio's status-callback webhook only ever gives us CallSid (its URL is configured statically
// on the phone number, so we can't thread our own sessionId through it like we do for /gather).
export function findActivePhoneSessionByCallSid(callSid: string) {
  return prisma.session.findFirst({
    where: { channel: 'phone', status: 'active', deletedAt: null, metadata: { path: ['callSid'], equals: callSid } },
  });
}
