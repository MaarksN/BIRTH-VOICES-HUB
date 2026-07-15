import { prisma } from '../lib/prisma.js';

export type SystemRoleName = 'admin' | 'user';

export async function getOrCreateSystemRole(name: SystemRoleName) {
  const existing = await prisma.role.findFirst({ where: { name, tenantId: null } });
  if (existing) return existing;
  return prisma.role.create({ data: { name, tenantId: null, description: `System role: ${name}` } });
}
