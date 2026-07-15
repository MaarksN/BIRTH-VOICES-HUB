import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../server.js';

let app: Express;

beforeAll(async () => {
  app = await appPromise;
});

async function registerUser(companyName: string) {
  const email = `tenant${Date.now()}${Math.random()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', companyName });
  const cookies = res.headers['set-cookie'];
  return { cookies, user: res.body.user };
}

describe('Multi-tenant data isolation', () => {
  it('does not leak call logs across tenants', async () => {
    const tenantA = await registerUser('Tenant A Inc');
    const tenantB = await registerUser('Tenant B Inc');

    const createRes = await request(app)
      .post('/api/call-logs')
      .set('Cookie', tenantA.cookies)
      .send({ patientName: 'Tenant A Patient' });
    expect(createRes.status).toBe(200);

    const tenantALogs = await request(app).get('/api/call-logs').set('Cookie', tenantA.cookies);
    expect(tenantALogs.body.callLogs.some((l: Record<string, unknown>) => l.patientName === 'Tenant A Patient')).toBe(true);

    const tenantBLogs = await request(app).get('/api/call-logs').set('Cookie', tenantB.cookies);
    expect(tenantBLogs.body.callLogs.some((l: Record<string, unknown>) => l.patientName === 'Tenant A Patient')).toBe(false);
  });

  it('does not leak agents across tenants', async () => {
    const tenantA = await registerUser('Tenant Agents A');
    const tenantB = await registerUser('Tenant Agents B');

    await request(app)
      .post('/api/agents')
      .set('Cookie', tenantA.cookies)
      .send({ name: 'Agent A', model: 'gemini-2.5-pro' });

    const tenantAAgents = await request(app).get('/api/agents').set('Cookie', tenantA.cookies);
    expect(tenantAAgents.body.agents.some((a: Record<string, unknown>) => a.name === 'Agent A')).toBe(true);

    const tenantBAgents = await request(app).get('/api/agents').set('Cookie', tenantB.cookies);
    expect(tenantBAgents.body.agents.some((a: Record<string, unknown>) => a.name === 'Agent A')).toBe(false);
  });

  it('only lists users belonging to the caller tenant', async () => {
    const tenantA = await registerUser('Tenant Users A');
    const tenantB = await registerUser('Tenant Users B');

    const usersRes = await request(app).get('/api/users').set('Cookie', tenantA.cookies);
    expect(usersRes.status).toBe(200);
    expect(usersRes.body.users.some((u: Record<string, unknown>) => u.email === tenantB.user.email)).toBe(false);
    expect(usersRes.body.users.some((u: Record<string, unknown>) => u.email === tenantA.user.email)).toBe(true);
  });
});
