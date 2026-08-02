import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    metric: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { listMetricsForUser, createMetric, deleteMetricsForUser } from '../src/repositories/metricRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('metricRepository.listMetricsForUser', () => {
  it('queries by tenant and user, orders by timestamp desc, limits to 1000', async () => {
    vi.mocked(prisma.metric.findMany).mockResolvedValue([{ id: 'm1' }] as any);

    const result = await listMetricsForUser('tenant-1', 'user-1');

    expect(prisma.metric.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'user-1' },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });
    expect(result).toEqual([{ id: 'm1' }]);
  });
});

describe('metricRepository.createMetric', () => {
  it('creates a metric with provided tags', async () => {
    vi.mocked(prisma.metric.create).mockResolvedValue({ id: 'm1' } as any);

    const result = await createMetric('tenant-1', 'user-1', {
      name: 'latency',
      value: 42,
      tags: { region: 'us' },
    });

    expect(prisma.metric.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'latency',
        value: 42,
        tags: { region: 'us' },
      },
    });
    expect(result).toEqual({ id: 'm1' });
  });

  it('defaults tags to an empty object when omitted', async () => {
    vi.mocked(prisma.metric.create).mockResolvedValue({ id: 'm2' } as any);

    await createMetric('tenant-1', 'user-1', { name: 'latency', value: 10 });

    expect(prisma.metric.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        name: 'latency',
        value: 10,
        tags: {},
      },
    });
  });
});

describe('metricRepository.deleteMetricsForUser', () => {
  it('deletes all metrics scoped to tenant and user', async () => {
    vi.mocked(prisma.metric.deleteMany).mockResolvedValue({ count: 3 } as any);

    const result = await deleteMetricsForUser('tenant-1', 'user-1');

    expect(prisma.metric.deleteMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', userId: 'user-1' } });
    expect(result).toEqual({ count: 3 });
  });
});
