import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    tenant: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { createTenant, findTenantById } from '../src/repositories/tenantRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('tenantRepository.createTenant', () => {
  it('creates a tenant with the given name', async () => {
    vi.mocked(prisma.tenant.create).mockResolvedValue({ id: 't1', name: 'Acme' } as any);

    const result = await createTenant('Acme');

    expect(prisma.tenant.create).toHaveBeenCalledWith({ data: { name: 'Acme' } });
    expect(result).toEqual({ id: 't1', name: 'Acme' });
  });
});

describe('tenantRepository.findTenantById', () => {
  it('queries by id, excludes soft-deleted rows', async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue({ id: 't1' } as any);

    const result = await findTenantById('t1');

    expect(prisma.tenant.findFirst).toHaveBeenCalledWith({ where: { id: 't1', deletedAt: null } });
    expect(result).toEqual({ id: 't1' });
  });
});
