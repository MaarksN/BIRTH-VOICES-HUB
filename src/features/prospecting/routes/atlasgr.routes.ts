import express from 'express';
import { logger } from '../../../lib/logger.js';
import { voiceProspectingService, BlandConfigurationError } from '../services/voice.service.js';
import { atlasGROutboundPayloadSchema, blandCallResultSchema } from '../validators/atlasgr.schema.js';
import { safeEqual } from '../lib/safeCompare.js';
import { IdempotencyCheckFailedError } from '../lib/webhookIdempotency.js';

const router = express.Router();

// This router is now mounted before the global express.json() (see server.ts — it also needs to
// run before csrfProtection, since both routes below are server-to-server webhooks authenticated
// by their own secret, not by session cookie/Origin). It needs its own JSON body parser, the same
// way telephony.routes.ts brings its own express.urlencoded() for the same reason.
router.use(express.json());

/**
 * Authenticates the AtlasGR CRM as the caller via a pre-shared secret sent in a custom header.
 *
 * Before this middleware existed, `POST /webhook/atlasgr/outbound` had NO authentication at all —
 * anyone who knew (or guessed) the URL could trigger a real, billed outbound call via Bland AI to
 * any phone number. That is AGENTS.md bloqueador #5/#11 territory. Fails closed: if the secret
 * isn't configured server-side, every request is rejected rather than silently accepted.
 */
function validateAtlasGRSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expectedSecret = process.env.ATLASGR_WEBHOOK_SECRET;
  if (!expectedSecret) {
    logger.error('AtlasGR webhook rejected: ATLASGR_WEBHOOK_SECRET is not configured (failing closed)');
    res.status(503).json({ error: 'Integração AtlasGR não está configurada.' });
    return;
  }

  const provided = req.headers['x-atlasgr-webhook-secret'];
  if (typeof provided !== 'string' || !safeEqual(provided, expectedSecret)) {
    logger.warn('AtlasGR webhook rejected: missing or invalid shared secret', {
      hasHeader: typeof provided === 'string',
    });
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  next();
}

/**
 * Authenticates the Bland AI call-result callback via a token embedded in the callback URL itself
 * (Bland AI's outbound-call API takes a plain `webhook` URL with no custom-header support, so a
 * shared secret has to travel in the path). The token is generated from `BLAND_WEBHOOK_TOKEN` and
 * embedded when the call is dispatched in `voice.service.ts`.
 */
function validateBlandCallbackToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expectedToken = process.env.BLAND_WEBHOOK_TOKEN;
  if (!expectedToken) {
    logger.error('Bland AI callback rejected: BLAND_WEBHOOK_TOKEN is not configured (failing closed)');
    res.status(503).json({ error: 'Callback da Bland AI não está configurado.' });
    return;
  }

  const provided = req.params.token;
  if (typeof provided !== 'string' || !safeEqual(provided, expectedToken)) {
    logger.warn('Bland AI callback rejected: invalid token');
    res.status(403).json({ error: 'Token inválido.' });
    return;
  }

  next();
}

router.post('/webhook/atlasgr/outbound', validateAtlasGRSecret, async (req, res) => {
  const parsed = atlasGROutboundPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('AtlasGR webhook rejected: invalid payload', { issues: parsed.error.issues });
    res.status(400).json({ error: 'Payload inválido.', issues: parsed.error.issues.map((i) => i.message) });
    return;
  }

  try {
    const result = await voiceProspectingService.triggerOutboundCall(parsed.data);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof IdempotencyCheckFailedError) {
      logger.error('AtlasGR webhook: idempotency check failed, rejecting to avoid a duplicate call', {
        error: error.message,
      });
      res.status(503).json({ error: 'Não foi possível processar o webhook no momento. Tente novamente.' });
      return;
    }
    if (error instanceof BlandConfigurationError) {
      logger.error('AtlasGR webhook: Bland AI integration is misconfigured', { error: error.message });
      res.status(503).json({ error: 'Integração com Bland AI não está configurada.' });
      return;
    }
    logger.error('AtlasGR webhook: failed to process outbound call request', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(502).json({ error: 'Failed to process AtlasGR webhook' });
  }
});

router.post('/webhooks/bland/:token', validateBlandCallbackToken, async (req, res) => {
  const parsed = blandCallResultSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('Bland AI callback rejected: invalid payload', { issues: parsed.error.issues });
    res.status(400).json({ error: 'Payload inválido.' });
    return;
  }

  const data = parsed.data as any;
  logger.info('Received Bland AI call result callback', {
    callId: data.call_id,
    status: data.status,
  });

  // Encaminha a transcrição, resumo e gravação para a AtlasGR
  const atlasBaseUrl = process.env.ATLASGR_BASE_URL || 'http://localhost:3005';
  const webhookSecret = process.env.ATLASGR_WEBHOOK_SECRET || 'segredo_compartilhado_atlasgr_123';

  try {
    await fetch(`${atlasBaseUrl}/api/webhooks/voice-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-atlasgr-webhook-secret': webhookSecret,
      },
      body: JSON.stringify({
        call_id: data.call_id,
        phone_number: data.to || data.variables?.phone_number,
        concatenated_transcript: data.concatenated_transcript || '',
        summary: data.summary || '',
        recording_url: data.recording_url || '',
        call_length: data.call_length || 0,
        completed: data.completed ?? true,
      }),
    });
    logger.info('Successfully forwarded voice call transcript to AtlasGR');
  } catch (err) {
    logger.error('Failed to forward voice call result to AtlasGR CRM', err);
  }

  res.status(200).json({ received: true });
});

export default router;
