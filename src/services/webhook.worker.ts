import { createHmac } from 'crypto';
import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { WebhookPayload } from './webhook.service.js';

/** Matches the 5s timeout published in docs/webhooks/index.md. */
const DELIVERY_TIMEOUT_MS = 5000;

/**
 * Signs the exact bytes we are about to send. Receivers recompute this HMAC over the raw request
 * body, so the string signed here and the string sent must be the same one — re-serializing the
 * payload for the request would risk a different key order and a signature that never verifies.
 */
function signBody(body: string): string | null {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function startWebhookWorker() {
  const connection = { ...getRedisConnectionOptions(), maxRetriesPerRequest: null };

  const worker = new Worker(
    'webhooks',
    async (job: Job<{ url: string; payload: WebhookPayload }>) => {
      const { url, payload } = job.data;
      logger.debug(`[WebhookWorker] Processing job ${job.id} for tenant ${payload.tenantId}`);

      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'BirthVoicesHub-Webhook/1.0',
      };

      const signature = signBody(body);
      if (signature) {
        headers['x-birthvoices-signature'] = signature;
      } else {
        // Without this the receiver cannot tell our requests from anyone else's POST to the same
        // public URL, so it is a deployment error rather than an optional nicety.
        logger.warn('[WebhookWorker] WEBHOOK_SIGNING_SECRET is not set — sending unsigned webhook');
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        logger.info(`[WebhookWorker] Successfully delivered event ${payload.type} to ${url}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`[WebhookWorker] Failed to deliver event ${payload.type} to ${url}. Error: ${msg}`);
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
