import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { appPromise } from '../server.js';

let app: Express;

beforeAll(async () => {
  app = await appPromise;
});

async function registerUser() {
  const email = `settings${Date.now()}${Math.random()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', companyName: 'Settings Test Co' });
  return { cookies: res.headers['set-cookie'], user: res.body.user };
}

describe('User settings API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });

  it('returns default settings before any are saved', async () => {
    const { cookies } = await registerUser();
    const res = await request(app).get('/api/settings').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.settings).toHaveProperty('theme');
  });

  it('saves and merges settings via PUT', async () => {
    const { cookies } = await registerUser();

    await request(app).post('/api/settings').set('Cookie', cookies).send({ settings: { theme: 'dark' } });
    const putRes = await request(app).put('/api/settings').set('Cookie', cookies).send({ settings: { notificationsEnabled: false } });

    expect(putRes.status).toBe(200);
    expect(putRes.body.settings.theme).toBe('dark');
    expect(putRes.body.settings.notificationsEnabled).toBe(false);
  });

  it('resets settings to default via DELETE', async () => {
    const { cookies } = await registerUser();
    await request(app).post('/api/settings').set('Cookie', cookies).send({ settings: { theme: 'dark' } });

    const delRes = await request(app).delete('/api/settings').set('Cookie', cookies);
    expect(delRes.status).toBe(200);

    const getRes = await request(app).get('/api/settings').set('Cookie', cookies);
    expect(getRes.body.settings.theme).toBe('light');
  });
});

describe('Voice runtime config API', () => {
  it('returns default voice runtime config', async () => {
    const { cookies } = await registerUser();
    const res = await request(app).get('/api/voice-runtime').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.config.language).toBe('pt-BR');
  });

  it('creates and updates voice runtime config', async () => {
    const { cookies } = await registerUser();
    await request(app).post('/api/voice-runtime').set('Cookie', cookies).send({ config: { voiceId: 'custom_voice' } });

    const putRes = await request(app).put('/api/voice-runtime').set('Cookie', cookies).send({ config: { speed: 1.2 } });
    expect(putRes.body.config.voiceId).toBe('custom_voice');
    expect(putRes.body.config.speed).toBe(1.2);
  });
});

describe('Onboarding checklist API', () => {
  it('returns default checklist and saves updates', async () => {
    const { cookies } = await registerUser();
    const getRes = await request(app).get('/api/onboarding').set('Cookie', cookies);
    expect(getRes.body.checklist.orgCreated).toBe(true);

    const saveRes = await request(app)
      .post('/api/onboarding')
      .set('Cookie', cookies)
      .send({ checklist: { ...getRes.body.checklist, agentCreated: true } });
    expect(saveRes.body.checklist.agentCreated).toBe(true);
  });
});

describe('Brand color API', () => {
  it('allows unauthenticated GET with a default color', async () => {
    const res = await request(app).get('/api/brand-color');
    expect(res.status).toBe(200);
    expect(res.body.brandColor).toBe('#2563eb');
  });

  it('requires auth to change the brand color', async () => {
    const res = await request(app).post('/api/brand-color').send({ color: '#ff0000' });
    expect(res.status).toBe(401);
  });

  it('saves a tenant brand color', async () => {
    const { cookies } = await registerUser();
    const saveRes = await request(app).post('/api/brand-color').set('Cookie', cookies).send({ color: '#ff0000' });
    expect(saveRes.status).toBe(200);

    const getRes = await request(app).get('/api/brand-color').set('Cookie', cookies);
    expect(getRes.body.brandColor).toBe('#ff0000');
  });
});
