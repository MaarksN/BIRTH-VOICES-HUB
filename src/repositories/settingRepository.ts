import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function findSetting(tenantId: string | null, userId: string | null, key: string) {
  return prisma.setting.findFirst({ where: { tenantId, userId, key } });
}

export function upsertSetting(tenantId: string | null, userId: string | null, key: string, value: unknown) {
  return prisma.setting.upsert({
    where: {
      tenantId_userId_key: { tenantId: tenantId as string, userId: userId as string, key },
    },
    create: { tenantId, userId, key, value: value as Prisma.InputJsonValue, isGlobal: !tenantId && !userId },
    update: { value: value as Prisma.InputJsonValue },
  });
}

export function deleteSetting(tenantId: string | null, userId: string | null, key: string) {
  return prisma.setting.deleteMany({ where: { tenantId, userId, key } });
}
