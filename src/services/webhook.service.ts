import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { getRedisUrl } from '../lib/env.js';
import { logger } from '../lib/logger.js';

export interface WebhookPayload {
  tenantId: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export class WebhookService {
  private webhookQueue: Queue;

  constructor() {
    const connection = new Redis(getRedisUrl(), { maxRetriesPerRequest: null });
    this.webhookQueue = new Queue('webhooks', { connection });
  }

  public async dispatch(tenantId: string, event: string, data: Record<string, unknown>): Promise<void> {
    try {
      const payload: WebhookPayload = {
        tenantId,
        event,
        data,
        timestamp: new Date().toISOString()
      };

      // In a real application, we would query the database to find the webhook URL
      // configured for this tenantId. For now, we will simulate looking up the URL.
      // Example: const url = await prisma.webhook.findFirst({ where: { tenantId } });
      const webhookUrl = process.env.TEST_WEBHOOK_URL; 
      
      if (!webhookUrl) {
        logger.debug(`[WebhookService] No webhook URL configured for tenant ${tenantId}`);
        return;
      }

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
