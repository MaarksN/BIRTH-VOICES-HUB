import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import {
  findUserByEmail,
  findUserById,
  createUser,
  findMembershipWithRole,
  createMembership,
  listUsersForTenant,
  updateUser,
  softDeleteUser,
  updateMembershipRole,
} from '../src/repositories/userRepository.js';

beforeEach(() => vi.clearAllMocks());

describe('userRepository.findUserByEmail', () => {
  it('lowercases the email and excludes soft-deleted rows', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'u1' } as any);

    const result = await findUserByEmail('User@Example.com');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'user@example.com', deletedAt: null },
    });
    expect(result).toEqual({ id: 'u1' });
  });
});

describe('userRepository.findUserById', () => {
  it('queries by id, excludes soft-deleted rows', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'u1' } as any);

    const result = await findUserById('u1');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 'u1', deletedAt: null } });
    expect(result).toEqual({ id: 'u1' });
  });
});

describe('userRepository.createUser', () => {
  it('lowercases the email and passes through the rest of the fields', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u1' } as any);

    const result = await createUser({
      email: 'New@Example.com',
      passwordHash: 'hash',
      companyName: 'Acme',
      tenantId: 'tenant-1',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        passwordHash: 'hash',
        companyName: 'Acme',
        tenantId: 'tenant-1',
      },
    });
    expect(result).toEqual({ id: 'u1' });
  });
});

describe('userRepository.findMembershipWithRole', () => {
  it('queries membership by user and tenant, including role', async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1', role: { name: 'admin' } } as any);

    const result = await findMembershipWithRole('u1', 'tenant-1');

    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', tenantId: 'tenant-1' },
      include: { role: true },
    });
    expect(result).toEqual({ id: 'm1', role: { name: 'admin' } });
  });
});

describe('userRepository.createMembership', () => {
  it('creates a membership linking user, tenant, and role', async () => {
    vi.mocked(prisma.membership.create).mockResolvedValue({ id: 'm1' } as any);

    const result = await createMembership('u1', 'tenant-1', 'role-1');

    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: { userId: 'u1', tenantId: 'tenant-1', roleId: 'role-1' },
    });
    expect(result).toEqual({ id: 'm1' });
  });
});

describe('userRepository.listUsersForTenant', () => {
  it('queries users by tenant, excludes soft-deleted rows, includes memberships/roles, orders by createdAt asc', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'u1' }] as any);

    const result = await listUsersForTenant('tenant-1');

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', deletedAt: null },
      include: { memberships: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([{ id: 'u1' }]);
  });
});

describe('userRepository.updateUser', () => {
  it('updates the user by id with provided data', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u1', companyName: 'New Co' } as any);

    const result = await updateUser('u1', { companyName: 'New Co' });

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { companyName: 'New Co' } });
    expect(result).toEqual({ id: 'u1', companyName: 'New Co' });
  });
});

describe('userRepository.softDeleteUser', () => {
  it('sets deletedAt on the user', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u1' } as any);
    const before = Date.now();

    const result = await softDeleteUser('u1');

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.user.update).mock.calls[0][0] as any;
    expect(call.where).toEqual({ id: 'u1' });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
    expect(call.data.deletedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result).toEqual({ id: 'u1' });
  });
});

describe('userRepository.updateMembershipRole', () => {
  it('updates the membership role scoped to user and tenant', async () => {
    vi.mocked(prisma.membership.updateMany).mockResolvedValue({ count: 1 } as any);

    const result = await updateMembershipRole('u1', 'tenant-1', 'role-2');

    expect(prisma.membership.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', tenantId: 'tenant-1' },
      data: { roleId: 'role-2' },
    });
    expect(result).toEqual({ count: 1 });
  });
});
