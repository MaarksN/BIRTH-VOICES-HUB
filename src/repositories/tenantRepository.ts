import { prisma } from '../lib/prisma.js';

export function createTenant(name: string) {
  return prisma.tenant.create({ data: { name } });
}

export function findTenantById(id: string) {
  return prisma.tenant.findFirst({ where: { id, deletedAt: null } });
}
