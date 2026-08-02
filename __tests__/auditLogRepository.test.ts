import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { createAuditLog } from '../src/repositories/auditLogRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('auditLogRepository.createAuditLog', () => {
  it('creates an audit log entry with provided details and tenantId', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: 'log-1' } as any);

    const result = await createAuditLog({
      tenantId: 'tenant-1',
      userId: 'user-1',
      action: 'LOGIN',
      details: { ip: '1.2.3.4' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'LOGIN',
        details: { ip: '1.2.3.4' },
      },
    });
    expect(result).toEqual({ id: 'log-1' });
  });

  it('defaults details to an empty object when omitted', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: 'log-2' } as any);

    await createAuditLog({ userId: 'user-1', action: 'LOGOUT', details: undefined });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: undefined,
        userId: 'user-1',
        action: 'LOGOUT',
        details: {},
      },
    });
  });
});
