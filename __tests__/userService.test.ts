import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/userRepository.js', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  createMembership: vi.fn(),
  listUsersForTenant: vi.fn(),
  updateUser: vi.fn(),
  softDeleteUser: vi.fn(),
  updateMembershipRole: vi.fn(),
}));

vi.mock('../src/repositories/roleRepository.js', () => ({
  getOrCreateSystemRole: vi.fn(async (name: string) => ({ id: `role-${name}`, name })),
}));

import {
  findUserByEmail,
  findUserById,
  createUser,
  createMembership,
  updateUser,
  softDeleteUser,
  updateMembershipRole,
} from '../src/repositories/userRepository.js';
import { createUserInTenant, updateUserProfile, deleteUser, UserServiceError } from '../src/services/userService.js';

const mockFindByEmail = vi.mocked(findUserByEmail);
const mockFindById = vi.mocked(findUserById);
const mockCreateUser = vi.mocked(createUser);
const mockCreateMembership = vi.mocked(createMembership);
const mockUpdateUser = vi.mocked(updateUser);
const mockSoftDeleteUser = vi.mocked(softDeleteUser);
const mockUpdateMembershipRole = vi.mocked(updateMembershipRole);

type UserRow = Awaited<ReturnType<typeof findUserById>>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('userService.createUserInTenant', () => {
  it('rejects duplicate emails without touching the database further', async () => {
    mockFindByEmail.mockResolvedValue({ id: 'existing' } as UserRow);

    await expect(createUserInTenant('tenant-1', { email: 'dup@example.com', password: 'x123456' })).rejects.toThrow(UserServiceError);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('creates a user and membership scoped to the caller tenant', async () => {
    mockFindByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue({ id: 'new-user', email: 'new@example.com' } as UserRow);

    const result = await createUserInTenant('tenant-1', { email: 'new@example.com', password: 'x123456', role: 'admin' });

    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
    expect(mockCreateMembership).toHaveBeenCalledWith('new-user', 'tenant-1', 'role-admin');
    expect(result).toEqual({ id: 'new-user', email: 'new@example.com', role: 'admin' });
  });
});

describe('userService.updateUserProfile', () => {
  it('blocks a non-admin from editing another user profile', async () => {
    await expect(
      updateUserProfile('other-user', 'tenant-1', { id: 'me', role: 'user' }, { companyName: 'Hacked Inc' })
    ).rejects.toMatchObject({ status: 403 });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('allows a non-admin to edit their own profile', async () => {
    mockFindById.mockResolvedValue({ id: 'me', tenantId: 'tenant-1' } as UserRow);

    await updateUserProfile('me', 'tenant-1', { id: 'me', role: 'user' }, { companyName: 'My Co' });
    expect(mockUpdateUser).toHaveBeenCalledWith('me', expect.objectContaining({ companyName: 'My Co' }));
  });

  it('rejects updates targeting a user outside the caller tenant (cross-tenant protection)', async () => {
    mockFindById.mockResolvedValue({ id: 'target', tenantId: 'tenant-OTHER' } as UserRow);

    await expect(
      updateUserProfile('target', 'tenant-1', { id: 'admin', role: 'admin' }, { companyName: 'x' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('ignores a role change requested by a non-admin even for their own profile', async () => {
    mockFindById.mockResolvedValue({ id: 'me', tenantId: 'tenant-1' } as UserRow);

    await updateUserProfile('me', 'tenant-1', { id: 'me', role: 'user' }, { role: 'admin' });
    expect(mockUpdateMembershipRole).not.toHaveBeenCalled();
  });
});

describe('userService.deleteUser', () => {
  it('prevents an admin from deleting their own account', async () => {
    await expect(deleteUser('me', 'tenant-1', 'me')).rejects.toThrow(UserServiceError);
    expect(mockSoftDeleteUser).not.toHaveBeenCalled();
  });

  it('rejects deleting a user from a different tenant', async () => {
    mockFindById.mockResolvedValue({ id: 'target', tenantId: 'tenant-OTHER' } as UserRow);

    await expect(deleteUser('target', 'tenant-1', 'admin')).rejects.toMatchObject({ status: 404 });
  });

  it('deletes a user within the same tenant', async () => {
    mockFindById.mockResolvedValue({ id: 'target', tenantId: 'tenant-1' } as UserRow);

    await deleteUser('target', 'tenant-1', 'admin');
    expect(mockSoftDeleteUser).toHaveBeenCalledWith('target');
  });
});
