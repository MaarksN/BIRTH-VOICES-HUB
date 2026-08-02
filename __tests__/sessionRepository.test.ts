import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import {
  listSessionsForUser,
  createSession,
  findSessionForUser,
  updateSession,
  deleteSession,
  createPhoneSession,
  findSessionById,
  findActivePhoneSessionByCallSid,
} from '../src/repositories/sessionRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('sessionRepository.listSessionsForUser', () => {
  it('queries by tenant and user, excludes soft-deleted rows, orders by createdAt desc', async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([{ id: 's1' }] as any);

    const result = await listSessionsForUser('tenant-1', 'user-1');

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'user-1', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([{ id: 's1' }]);
  });
});

describe('sessionRepository.createSession', () => {
  it('creates a session with provided fields', async () => {
    vi.mocked(prisma.session.create).mockResolvedValue({ id: 's1' } as any);

    const result = await createSession('tenant-1', 'user-1', {
      agentId: 'agent-1',
      channel: 'SMS',
      metadata: { foo: 'bar' },
    });

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        agentId: 'agent-1',
        channel: 'SMS',
        status: 'active',
        metadata: { foo: 'bar' },
      },
    });
    expect(result).toEqual({ id: 's1' });
  });

  it('applies defaults for omitted fields', async () => {
    vi.mocked(prisma.session.create).mockResolvedValue({ id: 's2' } as any);

    await createSession('tenant-1', 'user-1', {});

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        agentId: 'default_catarina',
        channel: 'WebChat',
        status: 'active',
        metadata: {},
      },
    });
  });
});

describe('sessionRepository.findSessionForUser', () => {
  it('scopes lookup by id, tenant, and user, excludes soft-deleted rows', async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue({ id: 's1' } as any);

    const result = await findSessionForUser('s1', 'tenant-1', 'user-1');

    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: { id: 's1', tenantId: 'tenant-1', userId: 'user-1', deletedAt: null },
    });
    expect(result).toEqual({ id: 's1' });
  });
});

describe('sessionRepository.updateSession', () => {
  it('updates the session by id with provided data', async () => {
    vi.mocked(prisma.session.update).mockResolvedValue({ id: 's1', status: 'closed' } as any);

    const result = await updateSession('s1', { status: 'closed' });

    expect(prisma.session.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { status: 'closed' } });
    expect(result).toEqual({ id: 's1', status: 'closed' });
  });
});

describe('sessionRepository.deleteSession', () => {
  it('soft-deletes the session by setting deletedAt', async () => {
    vi.mocked(prisma.session.update).mockResolvedValue({ id: 's1' } as any);
    const before = Date.now();

    const result = await deleteSession('s1');

    expect(prisma.session.update).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.session.update).mock.calls[0][0] as any;
    expect(call.where).toEqual({ id: 's1' });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
    expect(call.data.deletedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result).toEqual({ id: 's1' });
  });
});

describe('sessionRepository.createPhoneSession', () => {
  it('creates a phone session with null userId and phone channel', async () => {
    vi.mocked(prisma.session.create).mockResolvedValue({ id: 's3' } as any);

    const result = await createPhoneSession('tenant-1', 'agent-1', { callSid: 'CA123' });

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: null,
        agentId: 'agent-1',
        channel: 'phone',
        status: 'active',
        metadata: { callSid: 'CA123' },
      },
    });
    expect(result).toEqual({ id: 's3' });
  });

  it('defaults metadata to an empty object when nullish', async () => {
    vi.mocked(prisma.session.create).mockResolvedValue({ id: 's4' } as any);

    await createPhoneSession('tenant-1', 'agent-1', undefined);

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: null,
        agentId: 'agent-1',
        channel: 'phone',
        status: 'active',
        metadata: {},
      },
    });
  });
});

describe('sessionRepository.findSessionById', () => {
  it('queries by id only, excludes soft-deleted rows', async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue({ id: 's1' } as any);

    const result = await findSessionById('s1');

    expect(prisma.session.findFirst).toHaveBeenCalledWith({ where: { id: 's1', deletedAt: null } });
    expect(result).toEqual({ id: 's1' });
  });
});

describe('sessionRepository.findActivePhoneSessionByCallSid', () => {
  it('queries active phone sessions by callSid stored in metadata JSON', async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue({ id: 's1' } as any);

    const result = await findActivePhoneSessionByCallSid('CA123');

    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: {
        channel: 'phone',
        status: 'active',
        deletedAt: null,
        metadata: { path: ['callSid'], equals: 'CA123' },
      },
    });
    expect(result).toEqual({ id: 's1' });
  });
});
