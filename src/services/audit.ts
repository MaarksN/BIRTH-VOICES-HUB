import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { createAuditLog } from '../repositories/auditLogRepository.js';
import { getRedisUrl } from '../lib/env.js';

const redisUrl = getRedisUrl();
// BullMQ requires maxRetriesPerRequest: null on its connection; enqueue failures are still caught
// below so a Redis outage degrades to "audit log skipped" rather than blocking the request path.
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null, connectTimeout: 2000 });
connection.on('error', (err) => console.error('Audit Redis connection error:', err.message));

// bullmq bundles its own internal ioredis copy, which TS treats as a structurally distinct
// (but runtime-compatible) `Redis` type from the top-level ioredis instance we create above —
// a known cross-package duplicate-dependency mismatch, not a case of unchecked data.
/* eslint-disable @typescript-eslint/no-explicit-any */
const auditQueue = new Queue('auditLogs', { connection: connection as any });

new Worker(
  'auditLogs',
  async (job) => {
    await createAuditLog(job.data);
  },
  { connection: connection as any }
);
/* eslint-enable @typescript-eslint/no-explicit-any */

export function writeAuditLog(tenantId: string | undefined, userId: string, action: string, details: unknown) {
  auditQueue
    .add('log', { tenantId, userId, action, details }, { removeOnComplete: true, removeOnFail: 100 })
    .catch((err) => console.error('Audit queue enqueue failure:', err));
}
