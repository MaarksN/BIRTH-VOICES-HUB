import { logger } from '../../../lib/logger.js';
import type { AtlasGROutboundPayload } from '../validators/atlasgr.schema.js';
import { buildAtlasGROutboundIdempotencyKey, claimIdempotencyKey } from '../lib/webhookIdempotency.js';

export interface TriggerOutboundCallResult {
  success: boolean;
  duplicate: boolean;
  message: string;
  callId?: string;
  status?: string;
}

export class BlandConfigurationError extends Error {}

export class VoiceProspectingService {
  /**
   * Configures and triggers an outbound qualification call using Bland AI.
   *
   * Idempotent by design: a redelivered webhook for the same lead (`lead_id` when AtlasGR sends
   * one, otherwise a hash of phone/name/company) is detected via `webhookIdempotency.ts` and
   * short-circuited *before* any request reaches Bland AI, so a retried delivery never places a
   * second real call to the same person.
   *
   * @param payload The data required to initiate the call (already validated against
   *   `atlasGROutboundPayloadSchema` by the route).
   */
  async triggerOutboundCall(payload: AtlasGROutboundPayload): Promise<TriggerOutboundCallResult> {
    // Config is validated BEFORE the idempotency key is claimed on purpose: claiming first would
    // permanently "poison" the dedup key for this lead (for the full TTL) on every misconfigured
    // attempt, even though no call was ever actually placed — silently blocking every retry after
    // the misconfiguration is fixed. Claiming right before the network call keeps the guarantee
    // ("never call Bland AI twice for the same delivery") without that side effect.
    const apiKey = process.env.BLAND_API_KEY || '';
    if (!apiKey) {
      logger.warn('BLAND_API_KEY is not set in the environment');
      throw new BlandConfigurationError('BLAND_API_KEY missing');
    }

    const callbackToken = process.env.BLAND_WEBHOOK_TOKEN || '';
    if (!callbackToken) {
      // Without this token the result callback route (`/api/webhooks/bland/:token`) has nothing
      // to authenticate the request against, so it would have to accept it unauthenticated —
      // refusing to dispatch the call is the fail-closed choice here too.
      logger.warn('BLAND_WEBHOOK_TOKEN is not set in the environment');
      throw new BlandConfigurationError('BLAND_WEBHOOK_TOKEN missing');
    }

    const idempotencyKey = buildAtlasGROutboundIdempotencyKey({
      leadId: payload.lead_id,
      phoneNumber: payload.phone_number,
      name: payload.name,
      company: payload.company,
    });

    // Throws IdempotencyCheckFailedError if the dedup store itself is unreachable — left
    // unhandled here on purpose so it propagates to the route as a 503 ("fail closed": we'd
    // rather refuse the request than risk placing a duplicate real call because we couldn't tell).
    const claimed = await claimIdempotencyKey(idempotencyKey);
    if (!claimed) {
      logger.info('VoiceProspectingService: duplicate AtlasGR webhook delivery ignored', {
        leadId: payload.lead_id,
        idempotencyKey,
      });
      return {
        success: true,
        duplicate: true,
        message: 'Esta chamada já havia sido disparada anteriormente para este lead (webhook duplicado ignorado).',
      };
    }

    // `phone_number` intentionally left out of this log line — logging is the one place this
    // service writes personal data somewhere long-lived and less access-controlled than the
    // request itself, and name/company are already enough to correlate with AtlasGR's own logs.
    logger.info('VoiceProspectingService: Triggering outbound call via Bland AI', {
      name: payload.name,
      company: payload.company,
      leadId: payload.lead_id,
    });

    try {
      const response = await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: payload.phone_number,
          first_sentence: `Olá ${payload.name}! Tudo bem com você? Aqui é a inteligência comercial da AtlasGR.`,
          task: `Você é um assistente de vendas senior da AtlasGR. Fale OBRIGATORIAMENTE e EXCLUSIVAMENTE em Português do Brasil (pt-BR). Você está ligando para ${payload.name} da empresa ${payload.company}. Seu objetivo é fazer 3 perguntas curtas para entender se a empresa tem fit para a nossa plataforma de CRM e BI. Seja simpático, natural, e nunca fale mais que 2 frases seguidas sem deixar o cliente responder.`,
          language: 'pt-BR',
          voice: 'nat',
          reduce_latency: true,
          record: true,
          webhook: `${(process.env.WEBHOOK_BASE_URL || 'https://seu-dominio.com').replace(/\/$/, '')}/api/webhooks/bland/${callbackToken}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // `data` may contain the request we just sent echoed back, but never the API key — safe
        // to log for observability of upstream Bland AI failures.
        logger.error('Failed to trigger call via Bland AI', { status: response.status, body: data });
        throw new Error(data?.message || `Bland AI call failed with status ${response.status}`);
      }

      logger.info('Call successfully dispatched via Bland AI', { callId: data.call_id, status: data.status });

      return {
        success: true,
        duplicate: false,
        message: 'Outbound call triggered successfully via Bland AI',
        callId: data.call_id,
        status: data.status,
      };
    } catch (error) {
      logger.error('Error triggering voice call', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const voiceProspectingService = new VoiceProspectingService();
