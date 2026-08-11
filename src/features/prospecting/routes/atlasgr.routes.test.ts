import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/voice.service.js', () => ({
  voiceProspectingService: { triggerOutboundCall: vi.fn() },
  BlandConfigurationError: class BlandConfigurationError extends Error {},
}));

import { voiceProspectingService } from '../services/voice.service.js';
import atlasgrRoutes from './atlasgr.routes.js';

const mockTrigger = vi.mocked(voiceProspectingService.triggerOutboundCall);

const ORIGINAL_ENV = { ...process.env };
const SECRET = 'shared-secret-for-tests';
const validPayload = { phone_number: '+5511999998888', name: 'Fulano', company: 'Acme' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', atlasgrRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ATLASGR_WEBHOOK_SECRET = SECRET;
  process.env.BLAND_WEBHOOK_TOKEN = 'callback-token';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('POST /api/webhook/atlasgr/outbound — authentication', () => {
  it('rejects a request with no shared-secret header', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/webhook/atlasgr/outbound').send(validPayload);
    expect(res.status).toBe(401);
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('rejects a request with the wrong shared secret', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/webhook/atlasgr/outbound')
      .set('x-atlasgr-webhook-secret', 'wrong-secret')
      .send(validPayload);
    expect(res.status).toBe(401);
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('fails closed (503) when ATLASGR_WEBHOOK_SECRET is not configured server-side', async () => {
    delete process.env.ATLASGR_WEBHOOK_SECRET;
    const app = buildApp();
    const res = await request(app)
      .post('/api/webhook/atlasgr/outbound')
      .set('x-atlasgr-webhook-secret', 'anything')
      .send(validPayload);
    expect(res.status).toBe(503);
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('accepts a request with the correct shared secret and a valid payload', async () => {
    mockTrigger.mockResolvedValue({ success: true, duplicate: false, message: 'ok', callId: 'c1', status: 'queued' });
    const app = buildApp();
    const res = await request(app)
      .post('/api/webhook/atlasgr/outbound')
      .set('x-atlasgr-webhook-secret', SECRET)
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(mockTrigger).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/webhook/atlasgr/outbound — payload validation', () => {
  it('rejects a payload missing required fields', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/webhook/atlasgr/outbound')
      .set('x-atlasgr-webhook-secret', SECRET)
      .send({ phone_number: '+5511999998888' });
    expect(res.status).toBe(400);
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('rejects an unexpected extra field (schema is strict)', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/webhook/atlasgr/outbound')
      .set('x-atlasgr-webhook-secret', SECRET)
      .send({ ...validPayload, unexpected_field: 'x' });
    expect(res.status).toBe(400);
  });

  it('accepts an optional lead_id for stronger idempotency', async () => {
    mockTrigger.mockResolvedValue({ success: true, duplicate: false, message: 'ok' });
    const app = buildApp();
    const res = await request(app)
      .post('/api/webhook/atlasgr/outbound')
      .set('x-atlasgr-webhook-secret', SECRET)
      .send({ ...validPayload, lead_id: 'lead-42' });
    expect(res.status).toBe(200);
    expect(mockTrigger).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 'lead-42' }));
  });
});

describe('POST /api/webhook/atlasgr/outbound — error handling', () => {
  it('reports a downstream failure as 502 without leaking internal error details', async () => {
    mockTrigger.mockRejectedValue(new Error('Bland AI internal failure with sensitive stack info'));
    const app = buildApp();
    const res = await request(app)
      .post('/api/webhook/atlasgr/outbound')
      .set('x-atlasgr-webhook-secret', SECRET)
      .send(validPayload);
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('sensitive stack info');
  });
});

describe('POST /api/webhooks/bland/:token', () => {
  it('rejects an invalid token', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/webhooks/bland/wrong-token').send({ call_id: 'c1' });
    expect(res.status).toBe(403);
  });

  it('fails closed (503) when BLAND_WEBHOOK_TOKEN is not configured server-side', async () => {
    delete process.env.BLAND_WEBHOOK_TOKEN;
    const app = buildApp();
    const res = await request(app).post('/api/webhooks/bland/anything').send({ call_id: 'c1' });
    expect(res.status).toBe(503);
  });

  it('accepts a valid token and payload', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/webhooks/bland/callback-token').send({ call_id: 'c1', status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it('rejects a payload without call_id', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/webhooks/bland/callback-token').send({ status: 'completed' });
    expect(res.status).toBe(400);
  });
});
