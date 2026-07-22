import { PrismaClient } from '@prisma/client';
import { logger } from '../src/lib/logger.js';

const prisma = new PrismaClient();

const SYSTEM_ROLES = [
  { name: 'admin', description: 'System role: admin' },
  { name: 'user', description: 'System role: user' },
];

async function main() {
  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({ where: { name: role.name, tenantId: null } });
    if (!existing) {
      await prisma.role.create({ data: { ...role, tenantId: null } });
      logger.info(`Seeded system role: ${role.name}`);
    }
  }
}

main()
  .catch((err) => {
    logger.error('Seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
