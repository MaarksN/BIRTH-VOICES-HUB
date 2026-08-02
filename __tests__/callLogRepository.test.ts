import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    callLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import {
  listCallLogsForTenant,
  createCallLog,
  findCallLogForTenant,
  updateCallLog,
  deleteCallLog,
} from '../src/repositories/callLogRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('callLogRepository.listCallLogsForTenant', () => {
  it('queries by tenant, orders by timestamp desc, limits to 100', async () => {
    vi.mocked(prisma.callLog.findMany).mockResolvedValue([{ id: 'c1' }] as any);

    const result = await listCallLogsForTenant('tenant-1');

    expect(prisma.callLog.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    expect(result).toEqual([{ id: 'c1' }]);
  });
});

describe('callLogRepository.createCallLog', () => {
  it('creates a call log with provided fields', async () => {
    vi.mocked(prisma.callLog.create).mockResolvedValue({ id: 'c1' } as any);

    const result = await createCallLog('tenant-1', 'user-1', {
      patientName: 'Jane Doe',
      duration: '05:00',
      status: 'Completed',
      agent: 'Custom Agent',
    });

    expect(prisma.callLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        patientName: 'Jane Doe',
        duration: '05:00',
        status: 'Completed',
        time: 'Agora mesmo',
        agent: 'Custom Agent',
      },
    });
    expect(result).toEqual({ id: 'c1' });
  });

  it('applies defaults for omitted fields and converts null userId to undefined', async () => {
    vi.mocked(prisma.callLog.create).mockResolvedValue({ id: 'c2' } as any);

    await createCallLog('tenant-1', null, {});

    expect(prisma.callLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: undefined,
        patientName: 'Contato Anônimo',
        duration: '02:15',
        status: 'Concluído',
        time: 'Agora mesmo',
        agent: 'Catarina Atendimento',
      },
    });
  });
});

describe('callLogRepository.findCallLogForTenant', () => {
  it('scopes lookup by id and tenant', async () => {
    vi.mocked(prisma.callLog.findFirst).mockResolvedValue({ id: 'c1' } as any);

    const result = await findCallLogForTenant('c1', 'tenant-1');

    expect(prisma.callLog.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', tenantId: 'tenant-1' } });
    expect(result).toEqual({ id: 'c1' });
  });
});

describe('callLogRepository.updateCallLog', () => {
  it('updates the call log by id with provided data', async () => {
    vi.mocked(prisma.callLog.update).mockResolvedValue({ id: 'c1', status: 'Failed' } as any);

    const result = await updateCallLog('c1', { status: 'Failed' });

    expect(prisma.callLog.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { status: 'Failed' } });
    expect(result).toEqual({ id: 'c1', status: 'Failed' });
  });
});

describe('callLogRepository.deleteCallLog', () => {
  it('deletes the call log by id', async () => {
    vi.mocked(prisma.callLog.delete).mockResolvedValue({ id: 'c1' } as any);

    const result = await deleteCallLog('c1');

    expect(prisma.callLog.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(result).toEqual({ id: 'c1' });
  });
});
