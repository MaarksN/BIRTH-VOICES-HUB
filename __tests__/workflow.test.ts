import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../server.js';

let app: Express;

beforeAll(async () => {
  app = await appPromise;
});

async function registerUser() {
  const email = `workflow${Date.now()}${Math.random()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', companyName: 'Workflow Test Co' });
  const cookies = res.headers['set-cookie'];
  return { cookies, user: res.body.user };
}

describe('Workflow API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/workflow');
    expect(res.status).toBe(401);
  });

  it('returns null workflow before one is saved', async () => {
    const { cookies } = await registerUser();
    const res = await request(app).get('/api/workflow').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.workflow).toBeNull();
  });

  it('saves and retrieves a workflow', async () => {
    const { cookies } = await registerUser();

    const saveRes = await request(app)
      .post('/api/workflow')
      .set('Cookie', cookies)
      .send({ name: 'My Flow', nodes: [{ id: '1' }], edges: [] });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.workflow.name).toBe('My Flow');

    const getRes = await request(app).get('/api/workflow').set('Cookie', cookies);
    expect(getRes.status).toBe(200);
    expect(getRes.body.workflow.name).toBe('My Flow');
  });

  it('returns 404 when updating a workflow that does not exist yet', async () => {
    const { cookies } = await registerUser();
    const res = await request(app).put('/api/workflow').set('Cookie', cookies).send({ name: 'Updated' });
    expect(res.status).toBe(404);
  });

  it('deletes a saved workflow', async () => {
    const { cookies } = await registerUser();
    await request(app).post('/api/workflow').set('Cookie', cookies).send({ name: 'To Delete' });

    const delRes = await request(app).delete('/api/workflow').set('Cookie', cookies);
    expect(delRes.status).toBe(200);

    const getRes = await request(app).get('/api/workflow').set('Cookie', cookies);
    expect(getRes.body.workflow).toBeNull();
  });
});
