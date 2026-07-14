import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { createAuditLog } from '../repositories/auditLogRepository.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const auditQueue = new Queue('auditLogs', { connection: connection as any });

new Worker(
  'auditLogs',
  async (job) => {
    await createAuditLog(job.data);
  },
  { connection: connection as any }
);

export function writeAuditLog(tenantId: string | undefined, userId: string, action: string, details: unknown) {
  auditQueue
    .add('log', { tenantId, userId, action, details }, { removeOnComplete: true, removeOnFail: 100 })
    .catch((err) => console.error('Audit queue enqueue failure:', err));
}
