import { prisma } from '../lib/prisma.js';

const SYSTEM_ROLE_NAMES = ['admin', 'user'] as const;
export type SystemRoleName = typeof SYSTEM_ROLE_NAMES[number];

export async function getOrCreateSystemRole(name: SystemRoleName) {
  const existing = await prisma.role.findFirst({ where: { name, tenantId: null } });
  if (existing) return existing;
  return prisma.role.create({ data: { name, tenantId: null, description: `System role: ${name}` } });
}
