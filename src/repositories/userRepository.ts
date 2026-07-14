import { prisma } from '../lib/prisma.js';

export function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
}

export function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function createUser(data: { email: string; passwordHash: string; companyName: string; tenantId: string }) {
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      companyName: data.companyName,
      tenantId: data.tenantId,
    },
  });
}

export function findMembershipWithRole(userId: string, tenantId: string) {
  return prisma.membership.findFirst({
    where: { userId, tenantId },
    include: { role: true },
  });
}

export function createMembership(userId: string, tenantId: string, roleId: string) {
  return prisma.membership.create({ data: { userId, tenantId, roleId } });
}

export function listUsersForTenant(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    include: { memberships: { include: { role: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export function updateUser(id: string, data: { companyName?: string; passwordHash?: string }) {
  return prisma.user.update({ where: { id }, data });
}

export function softDeleteUser(id: string) {
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function updateMembershipRole(userId: string, tenantId: string, roleId: string) {
  return prisma.membership.updateMany({ where: { userId, tenantId }, data: { roleId } });
}
