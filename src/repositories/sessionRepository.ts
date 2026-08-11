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

// Guard against an automated dialer double-calling the same lead: a retry loop that fires before
// the first call reaches a terminal status would otherwise ring the same person twice at once.
//
// Read-only helper, kept for callers that only need the "is a call already in flight?" check
// without also creating a session (e.g. a future status-inspection endpoint). The actual dial path
// must NOT build on this function directly — see createOutboundPhoneSessionIfNoneInFlight below
// for why a plain "check, then create" here is not safe against concurrent requests.
export function findActiveOutboundSessionToNumber(tenantId: string, toNumber: string) {
  return prisma.session.findFirst({
    where: {
      tenantId,
      channel: 'phone',
      status: 'active',
      deletedAt: null,
      AND: [
        { metadata: { path: ['direction'], equals: 'outbound' } },
        { metadata: { path: ['to'], equals: toNumber } },
      ],
    },
  });
}

/**
 * Atomically checks for an outbound call already in flight to this number and creates the new
 * phone session in the same database transaction.
 *
 * Doing the check and the create as two separate round-trips (as this repository used to, and as
 * `findActiveOutboundSessionToNumber` still allows a careless caller to do) is a classic
 * check-then-act race: two near-simultaneous requests for the same tenant+number — a UI
 * double-click, or a caller retrying an outbound-call POST after a timeout without knowing whether
 * the first attempt landed — can both observe "no call in flight" before either has written its
 * own session, and both go on to dial the same lead for real.
 *
 * Running the read and the write inside one `Serializable` transaction closes that window: Postgres
 * detects the conflict between the two concurrent transactions and aborts one of them with a
 * serialization failure (Prisma error code `P2034`) instead of letting both believe the number was
 * free. Callers must treat that error the same as `inFlight: true` — see
 * outboundCallService.initiateOutboundCall.
 */
export async function createOutboundPhoneSessionIfNoneInFlight(
  tenantId: string,
  agentId: string,
  toNumber: string,
  metadata: unknown,
) {
  return prisma.$transaction(
    async (tx) => {
      const inFlight = await tx.session.findFirst({
        where: {
          tenantId,
          channel: 'phone',
          status: 'active',
          deletedAt: null,
          AND: [
            { metadata: { path: ['direction'], equals: 'outbound' } },
            { metadata: { path: ['to'], equals: toNumber } },
          ],
        },
      });
      if (inFlight) {
        return { session: null, inFlight: true as const };
      }

      const session = await tx.session.create({
        data: {
          tenantId,
          userId: null,
          agentId,
          channel: 'phone',
          status: 'active',
          metadata: (metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      return { session, inFlight: false as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
