import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../server.js';

let app: Express;

beforeAll(async () => {
  app = await appPromise;
});

async function registerUser(companyName: string) {
  const email = `msa${Date.now()}${Math.random()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', companyName });
  return { cookies: res.headers['set-cookie'], user: res.body.user };
}

describe('Metrics API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(401);
  });

  it('creates and lists metrics, then clears them', async () => {
    const { cookies } = await registerUser('Metrics Co');

    const createRes = await request(app)
      .post('/api/metrics')
      .set('Cookie', cookies)
      .send({ name: 'latency_ms', value: 120 });
    expect(createRes.status).toBe(200);

    const listRes = await request(app).get('/api/metrics').set('Cookie', cookies);
    expect(listRes.body.metrics.some((m: Record<string, unknown>) => m.name === 'latency_ms')).toBe(true);

    const clearRes = await request(app).delete('/api/metrics').set('Cookie', cookies);
    expect(clearRes.status).toBe(200);

    const afterClear = await request(app).get('/api/metrics').set('Cookie', cookies);
    expect(afterClear.body.metrics.length).toBe(0);
  });

  it('rejects direct edits to consolidated metrics', async () => {
    const { cookies } = await registerUser('Metrics Co 2');
    const res = await request(app).put('/api/metrics').set('Cookie', cookies).send({});
    expect(res.status).toBe(501);
  });
});

describe('Sessions API', () => {
  it('creates, updates and deletes a session', async () => {
    const { cookies } = await registerUser('Sessions Co');

    const createRes = await request(app)
      .post('/api/sessions')
      .set('Cookie', cookies)
      .send({ channel: 'WebChat' });
    expect(createRes.status).toBe(200);
    const sessionId = createRes.body.session.id;

    const updateRes = await request(app)
      .put(`/api/sessions/${sessionId}`)
      .set('Cookie', cookies)
      .send({ status: 'ended', metadata: { reason: 'completed' } });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.session.status).toBe('ended');

    const deleteRes = await request(app).delete(`/api/sessions/${sessionId}`).set('Cookie', cookies);
    expect(deleteRes.status).toBe(200);

    const secondDelete = await request(app).delete(`/api/sessions/${sessionId}`).set('Cookie', cookies);
    expect(secondDelete.status).toBe(404);
  });

  it('returns 404 when updating a session belonging to another tenant', async () => {
    const owner = await registerUser('Session Owner Co');
    const intruder = await registerUser('Session Intruder Co');

    const createRes = await request(app).post('/api/sessions').set('Cookie', owner.cookies).send({ channel: 'WebChat' });
    const sessionId = createRes.body.session.id;

    const res = await request(app).put(`/api/sessions/${sessionId}`).set('Cookie', intruder.cookies).send({ status: 'ended' });
    expect(res.status).toBe(404);
  });
});

describe('Agents API', () => {
  it('creates and deletes an agent scoped to the tenant', async () => {
    const { cookies } = await registerUser('Agents Co');

    const createRes = await request(app)
      .post('/api/agents')
      .set('Cookie', cookies)
      .send({ name: 'Catarina', model: 'gemini-2.5-pro' });
    expect(createRes.status).toBe(200);
    const agentId = createRes.body.agent.id;

    const listRes = await request(app).get('/api/agents').set('Cookie', cookies);
    expect(listRes.body.agents.some((a: Record<string, unknown>) => a.id === agentId)).toBe(true);

    const deleteRes = await request(app).delete(`/api/agents/${agentId}`).set('Cookie', cookies);
    expect(deleteRes.status).toBe(200);

    const listAfter = await request(app).get('/api/agents').set('Cookie', cookies);
    expect(listAfter.body.agents.some((a: Record<string, unknown>) => a.id === agentId)).toBe(false);
  });
});
