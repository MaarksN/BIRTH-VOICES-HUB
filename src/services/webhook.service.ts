import { randomUUID } from 'crypto';
import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/env.js';
import { logger } from '../lib/logger.js';

/**
 * Envelope documented in docs/webhooks/index.md — consumers verify the signature over exactly
 * this JSON, so field names here are a published contract, not an internal detail.
 */
export interface WebhookPayload {
  id: string;
  type: string;
  timestamp: string;
  tenantId: string;
  data: Record<string, unknown>;
}

export class WebhookService {
  private webhookQueue: Queue;

  constructor() {
    this.webhookQueue = new Queue('webhooks', {
      connection: { ...getRedisConnectionOptions(), maxRetriesPerRequest: null },
    });
  }

  /**
   * Queues an event for delivery. Never throws: webhook delivery is a side effect of whatever
   * business operation produced the event, and must not be able to fail it.
   *
   * @param targetUrl Per-event destination — used for calls that carry their own callback URL.
   *                  Falls back to the deployment-wide `WEBHOOK_URL`.
   */
  public async dispatch(
    tenantId: string,
    event: string,
    data: Record<string, unknown>,
    targetUrl?: string,
  ): Promise<void> {
    try {
      // TODO: once a Webhook model exists, resolve the tenant's configured endpoint here instead
      // of relying on a per-call URL or a single deployment-wide one.
      const webhookUrl = targetUrl || process.env.WEBHOOK_URL || process.env.TEST_WEBHOOK_URL;

      if (!webhookUrl) {
        logger.debug(`[WebhookService] No webhook URL configured for tenant ${tenantId}`);
        return;
      }

      const payload: WebhookPayload = {
        id: `evt_${randomUUID()}`,
        type: event,
        timestamp: new Date().toISOString(),
        tenantId,
        data,
      };

      await this.webhookQueue.add(
        'send_webhook',
        { url: webhookUrl, payload },
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      );

      logger.info(`[WebhookService] Queued event ${event} for tenant ${tenantId}`);
    } catch (error) {
      logger.error(`[WebhookService] Error dispatching webhook event ${event}`, error);
    }
  }
}

export const webhookService = new WebhookService();
