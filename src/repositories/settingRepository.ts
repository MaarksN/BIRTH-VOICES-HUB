import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function findSetting(tenantId: string | null, userId: string | null, key: string) {
  return prisma.setting.findFirst({ where: { tenantId, userId, key } });
}

export async function upsertSetting(tenantId: string | null, userId: string | null, key: string, value: unknown) {
  // Prisma's compound-unique `where` rejects null for a nullable member (tenantId/userId),
  // so `upsert` can't be used directly when either is null (e.g. tenant-wide settings).
  const existing = await prisma.setting.findFirst({ where: { tenantId, userId, key } });
  if (existing) {
    return prisma.setting.update({ where: { id: existing.id }, data: { value: value as Prisma.InputJsonValue } });
  }
  return prisma.setting.create({
    data: { tenantId, userId, key, value: value as Prisma.InputJsonValue, isGlobal: !tenantId && !userId },
  });
}

export function deleteSetting(tenantId: string | null, userId: string | null, key: string) {
  return prisma.setting.deleteMany({ where: { tenantId, userId, key } });
}
