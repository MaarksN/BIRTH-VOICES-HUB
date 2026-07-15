import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../server.js';

let app: Express;

beforeAll(async () => {
  app = await appPromise;
});

describe('AI endpoints require authentication (cost-abuse prevention)', () => {
  it('rejects unauthenticated /api/chat', async () => {
    const res = await request(app).post('/api/chat').send({ currentMessages: [{ text: 'hi' }] });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated /api/tts', async () => {
    const res = await request(app).post('/api/tts').send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated /api/generate-video', async () => {
    const res = await request(app).post('/api/generate-video').send({ prompt: 'x' });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated /api/ai/generate-workflow', async () => {
    const res = await request(app).post('/api/ai/generate-workflow').send({ prompt: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('Observability endpoint requires authentication', () => {
  it('rejects unauthenticated GET /api/observability/metrics', async () => {
    const res = await request(app).get('/api/observability/metrics');
    expect(res.status).toBe(401);
  });
});
