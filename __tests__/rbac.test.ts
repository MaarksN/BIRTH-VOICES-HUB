import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../server.js';

let app: Express;

beforeAll(async () => {
  app = await appPromise;
});

async function registerAdmin() {
  const email = `admin${Date.now()}${Math.random()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', companyName: 'RBAC Test Co' });
  return { cookies: res.headers['set-cookie'], user: res.body.user };
}

describe('Role-based access control', () => {
  it('the user who registers a new company becomes its admin', async () => {
    const { user } = await registerAdmin();
    expect(user.role).toBe('admin');
  });

  it('a non-admin member cannot list or manage users', async () => {
    const admin = await registerAdmin();

    const createRes = await request(app)
      .post('/api/users')
      .set('Cookie', admin.cookies)
      .send({ email: `member${Date.now()}@example.com`, password: 'password123', role: 'user' });
    expect(createRes.status).toBe(200);

    const memberEmail = createRes.body.user.email;
    const loginRes = await request(app).post('/api/auth/login').send({ email: memberEmail, password: 'password123' });
    const memberCookies = loginRes.headers['set-cookie'];

    const listRes = await request(app).get('/api/users').set('Cookie', memberCookies);
    expect(listRes.status).toBe(403);

    const deleteRes = await request(app).delete(`/api/users/${admin.user.id}`).set('Cookie', memberCookies);
    expect(deleteRes.status).toBe(403);
  });

  it('an admin cannot delete their own account', async () => {
    const admin = await registerAdmin();
    const res = await request(app).delete(`/api/users/${admin.user.id}`).set('Cookie', admin.cookies);
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests to protected observability endpoint', async () => {
    const res = await request(app).get('/api/observability/metrics');
    expect(res.status).toBe(401);
  });
});
