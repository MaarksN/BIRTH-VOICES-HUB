import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../server.js';

let app: Express;

beforeAll(async () => {
  app = await appPromise;
});

describe('Health endpoints', () => {
  it('GET /health returns 200 (liveness, no dependency checks)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /live returns 200', async () => {
    const res = await request(app).get('/live');
    expect(res.status).toBe(200);
  });

  it('GET /ready reports database and redis checks', async () => {
    const res = await request(app).get('/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.body.checks).toHaveProperty('database');
    expect(res.body.checks).toHaveProperty('redis');
  });

  it('GET /api/health is also exposed for load-test tooling', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});
