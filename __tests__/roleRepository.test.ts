import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    role: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { getOrCreateSystemRole } from '../src/repositories/roleRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('roleRepository.getOrCreateSystemRole', () => {
  it('returns the existing system role without creating one', async () => {
    vi.mocked(prisma.role.findFirst).mockResolvedValue({ id: 'role-1', name: 'admin' } as any);

    const result = await getOrCreateSystemRole('admin');

    expect(prisma.role.findFirst).toHaveBeenCalledWith({ where: { name: 'admin', tenantId: null } });
    expect(prisma.role.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'role-1', name: 'admin' });
  });

  it('creates the system role when none exists', async () => {
    vi.mocked(prisma.role.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.role.create).mockResolvedValue({ id: 'role-2', name: 'user' } as any);

    const result = await getOrCreateSystemRole('user');

    expect(prisma.role.findFirst).toHaveBeenCalledWith({ where: { name: 'user', tenantId: null } });
    expect(prisma.role.create).toHaveBeenCalledWith({
      data: { name: 'user', tenantId: null, description: 'System role: user' },
    });
    expect(result).toEqual({ id: 'role-2', name: 'user' });
  });
});
