import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { WebhookPayload } from './webhook.service.js';

export function startWebhookWorker() {
  const connection = { ...getRedisConnectionOptions(), maxRetriesPerRequest: null };

  const worker = new Worker(
    'webhooks',
    async (job: Job<{ url: string; payload: WebhookPayload }>) => {
      const { url, payload } = job.data;
      logger.debug(`[WebhookWorker] Processing job ${job.id} for tenant ${payload.tenantId}`);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BirthVoicesHub-Webhook/1.0',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        logger.info(`[WebhookWorker] Successfully delivered event ${payload.event} to ${url}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`[WebhookWorker] Failed to deliver event ${payload.event} to ${url}. Error: ${msg}`);
        throw error; // Let BullMQ handle the retry based on backoff config
      }
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[WebhookWorker] Job ${job?.id} failed. Reason: ${err.message}`);
  });

  logger.info('[WebhookWorker] Started listening for webhook events');
  
  return worker;
}
