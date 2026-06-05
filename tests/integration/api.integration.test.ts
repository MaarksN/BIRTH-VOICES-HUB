import crypto from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AgentConfig, SessionRecord, StoredAgent, User } from '../../types';
import { startApiTestServer, type ApiTestServer } from './apiServer';

type AuthResult = {
  token: string;
  user: Required<Pick<User, 'id' | 'name' | 'company' | 'email' | 'brandColor'>> & {
    role?: string;
  };
};

type AgentResult = {
  agent: StoredAgent;
};

type AgentsResult = {
  agents: StoredAgent[];
};

type SessionResult = {
  session: SessionRecord;
};

type SessionsResult = {
  sessions: SessionRecord[];
};

type DeliveriesResult = {
  deliveries: NonNullable<SessionRecord['integrationDelivery']>[];
};

type ErrorResult = {
  error: string;
};

type TestDatabase = {
  memberships: Array<{ userId: string; organizationId: string; role: string; updatedAt: string }>;
  telephonyCalls: Array<Record<string, unknown>>;
};

const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const agentPayload: AgentConfig = {
  name: 'Agente Integração',
  template: 'research',
  description: 'Roteiro para validar a API real em testes de integração.',
  language: 'Português Brasileiro',
  tone: ['acolhedor', 'objetivo'],
  speed: 1,
  systemInstruction: 'Conduza a conversa de validação com clareza.',
  analysisPrompt: 'Extraia campos operacionais e riscos.',
  questions: [
    {
      id: 'q-nome',
      text: 'Qual é o nome da pessoa atendida?',
      type: 'open',
      collectAs: 'Nome',
      required: true,
    },
    {
      id: 'q-risco',
      text: 'Existe algum risco urgente?',
      type: 'open',
      collectAs: 'Risco',
      riskKeywords: ['urgente'],
      stopOnRisk: true,
    },
  ],
};

let server: ApiTestServer;
let tenantA: AuthResult | undefined;
let tenantB: AuthResult | undefined;
let tenantAAgent: StoredAgent | undefined;
let tenantASession: SessionRecord | undefined;

function jsonRequest(method: string, token?: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

async function requestRaw<TPayload = unknown>(pathname: string, options: RequestInit = {}) {
  const response = await fetch(`${server.baseUrl}${pathname}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  return { response, payload: payload as TPayload };
}

async function requestOk<TPayload>(pathname: string, options: RequestInit = {}) {
  const { response, payload } = await requestRaw<TPayload>(pathname, options);
  expect(response.ok, `${options.method || 'GET'} ${pathname}: ${JSON.stringify(payload)}`).toBe(true);
  return payload;
}

async function expectStatus<TPayload = ErrorResult>(pathname: string, status: number, options: RequestInit = {}) {
  const { response, payload } = await requestRaw<TPayload>(pathname, options);
  expect(response.status, `${options.method || 'GET'} ${pathname}: ${JSON.stringify(payload)}`).toBe(status);
  return payload;
}

async function readTestDatabase() {
  const raw = await readFile(path.join(server.dataDir, 'birth-voices.json'), 'utf8');
  return JSON.parse(raw) as TestDatabase;
}

async function writeTestDatabase(data: TestDatabase) {
  await writeFile(path.join(server.dataDir, 'birth-voices.json'), JSON.stringify(data, null, 2));
}

function signTwilioRequest(pathname: string, params: Record<string, string> = {}) {
  const payload = `${server.baseUrl}${pathname}${Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('')}`;
  return crypto.createHmac('sha1', 'integration-test-token').update(Buffer.from(payload, 'utf8')).digest('base64');
}

function twilioRequest(pathname: string, params: Record<string, string> = {}) {
  const body = new URLSearchParams(params);
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': signTwilioRequest(pathname, params),
    },
    body,
  };
}

async function register(email: string, companyName: string) {
  return requestOk<AuthResult>(
    '/api/auth/register',
    jsonRequest('POST', undefined, {
      companyName,
      email,
      password: 'senha-segura-123',
    }),
  );
}

async function ensureTenants() {
  tenantA ||= await register(`tenant-a-${unique}@example.com`, 'Birth Voices A');
  tenantB ||= await register(`tenant-b-${unique}@example.com`, 'Birth Voices B');
  return { tenantA, tenantB };
}

async function ensureTenantAAgent() {
  const { tenantA: owner } = await ensureTenants();
  if (tenantAAgent) return tenantAAgent;

  const created = await requestOk<AgentResult>('/api/agents', jsonRequest('POST', owner.token, agentPayload));
  tenantAAgent = created.agent;
  return tenantAAgent;
}

async function ensureTenantASession() {
  const { tenantA: owner } = await ensureTenants();
  const agent = await ensureTenantAAgent();
  if (tenantASession) return tenantASession;

  const created = await requestOk<SessionResult>(
    '/api/sessions/analyze-and-save',
    jsonRequest('POST', owner.token, {
      agentId: agent.id,
      caller: 'Maria Integração',
      durationSeconds: 95,
      transcriptItems: [
        { role: 'agent', text: agent.questions[0].text },
        { role: 'user', text: 'Maria Integração' },
        { role: 'agent', text: agent.questions[1].text },
        { role: 'user', text: 'Sim, é urgente' },
      ],
      structuredDraft: {
        extracted: [{ label: 'Nome', value: 'Maria Integração' }],
        triggeredRisks: [
          {
            questionId: 'q-risco',
            question: agent.questions[1].text,
            keyword: 'urgente',
            answer: 'Sim, é urgente',
            detectedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );

  tenantASession = created.session;
  return tenantASession;
}

describe('Birth Voices API integration', () => {
  beforeAll(async () => {
    server = await startApiTestServer();
  }, 30000);

  afterAll(async () => {
    await server.stop();
  });

  it('starts with isolated storage and protects authenticated routes', async () => {
    const { response, payload: status } = await requestRaw<{ storage: string }>('/api/status');
    expect(response.ok).toBe(true);
    expect(path.normalize(status.storage)).toBe(path.join(server.dataDir, 'birth-voices.json'));
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('x-request-id')).toBeTruthy();
    const health = await requestOk<{ status: string; checks: { storage: boolean } }>('/api/health');
    expect(health.status).toBe('ok');
    expect(health.checks.storage).toBe(true);
    await expectStatus('/api/me', 401);
  });

  it('registers, rejects duplicate accounts, authenticates and invalidates logout tokens', async () => {
    const { tenantA: owner } = await ensureTenants();

    expect(owner.token).toHaveLength(64);
    expect(owner.user.email).toBe(`tenant-a-${unique}@example.com`);
    expect(owner.user.company).toBe('Birth Voices A');
    expect(owner.user).not.toHaveProperty('passwordHash');

    await expectStatus('/api/auth/register', 409, jsonRequest('POST', undefined, {
      companyName: 'Duplicada',
      email: owner.user.email.toUpperCase(),
      password: 'senha-segura-123',
    }));
    await expectStatus('/api/auth/login', 401, jsonRequest('POST', undefined, {
      email: owner.user.email,
      password: 'senha-incorreta',
    }));

    const login = await requestOk<AuthResult>('/api/auth/login', jsonRequest('POST', undefined, {
      email: owner.user.email,
      password: 'senha-segura-123',
    }));
    const me = await requestOk<{ user: User }>('/api/me', jsonRequest('GET', login.token));

    expect(me.user.id).toBe(owner.user.id);

    await requestOk<{ ok: boolean }>('/api/auth/logout', jsonRequest('POST', login.token));
    await expectStatus('/api/me', 401, jsonRequest('GET', login.token));
  });

  it('keeps agents isolated by owner across create, list and update operations', async () => {
    const { tenantA: owner, tenantB: outsider } = await ensureTenants();
    const agent = await ensureTenantAAgent();

    expect(agent.ownerId).toBeUndefined();
    expect(agent.name).toBe(agentPayload.name);

    const ownerAgents = await requestOk<AgentsResult>('/api/agents', jsonRequest('GET', owner.token));
    const outsiderAgents = await requestOk<AgentsResult>('/api/agents', jsonRequest('GET', outsider.token));

    expect(ownerAgents.agents.map((item) => item.id)).toContain(agent.id);
    expect(outsiderAgents.agents).toHaveLength(0);

    await expectStatus(`/api/agents/${agent.id}`, 404, jsonRequest('PUT', outsider.token, {
      ...agentPayload,
      name: 'Tentativa externa',
    }));

    const updated = await requestOk<AgentResult>(`/api/agents/${agent.id}`, jsonRequest('PUT', owner.token, {
      ...agentPayload,
      name: 'Agente Integração Atualizado',
    }));

    expect(updated.agent.id).toBe(agent.id);
    expect(updated.agent.name).toBe('Agente Integração Atualizado');
    tenantAAgent = updated.agent;
  });

  it('enforces RBAC roles from memberships', async () => {
    const viewer = await register(`viewer-${unique}@example.com`, 'Viewer Org');
    const data = await readTestDatabase();
    const membership = data.memberships.find((item) => item.userId === viewer.user.id);
    expect(membership).toBeTruthy();
    membership!.role = 'viewer';
    membership!.updatedAt = new Date().toISOString();
    await writeTestDatabase(data);

    const listed = await requestOk<AgentsResult>('/api/agents', jsonRequest('GET', viewer.token));
    expect(listed.agents).toEqual([]);
    await expectStatus('/api/agents', 403, jsonRequest('POST', viewer.token, agentPayload));

    const suspended = await register(`suspended-${unique}@example.com`, 'Suspended Org');
    const suspendedData = await readTestDatabase();
    const suspendedMembership = suspendedData.memberships.find((item) => item.userId === suspended.user.id);
    suspendedMembership!.role = 'suspended';
    suspendedMembership!.updatedAt = new Date().toISOString();
    await writeTestDatabase(suspendedData);
    await expectStatus('/api/me', 403, jsonRequest('GET', suspended.token));
  });

  it('creates real sessions, deterministic analysis and per-user session isolation', async () => {
    const { tenantA: owner, tenantB: outsider } = await ensureTenants();
    const agent = await ensureTenantAAgent();

    await expectStatus('/api/sessions/analyze-and-save', 404, jsonRequest('POST', outsider.token, {
      agentId: agent.id,
      caller: 'Pessoa externa',
      durationSeconds: 12,
      transcriptItems: [{ role: 'user', text: 'Não deveria acessar' }],
    }));

    const analyzed = await ensureTenantASession();

    expect(analyzed.agentName).toBe(agent.name);
    expect(analyzed.riskLevel).toBe('Alto');
    expect(analyzed.tags).toContain('risco-detectado');
    expect(analyzed.extracted).toContainEqual({ label: 'Nome', value: 'Maria Integração' });
    expect(analyzed.integrationDelivery?.status).toBe('not_configured');

    const manual = await requestOk<SessionResult>('/api/sessions', jsonRequest('POST', owner.token, {
      agentName: agent.name,
      caller: 'Contato Manual',
      duration: '01:10',
      sentiment: 'Neutro',
      riskLevel: 'Baixo',
      score: 91,
      summary: 'Sessão manual criada pelo teste de integração.',
      transcript: 'Agente: Olá\nUsuário: Olá',
      tags: ['qa'],
      followUp: 'Sem pendências.',
      extracted: [{ label: 'Origem', value: 'Integração' }],
    }));

    expect(manual.session.integrationDelivery?.status).toBe('not_configured');

    const ownerSessions = await requestOk<SessionsResult>('/api/sessions', jsonRequest('GET', owner.token));
    const outsiderSessions = await requestOk<SessionsResult>('/api/sessions', jsonRequest('GET', outsider.token));

    expect(ownerSessions.sessions.map((item) => item.id)).toEqual(expect.arrayContaining([analyzed.id, manual.session.id]));
    expect(outsiderSessions.sessions).toHaveLength(0);
  });

  it('exposes integration settings and isolates delivery history by user', async () => {
    const { tenantA: owner, tenantB: outsider } = await ensureTenants();
    const session = await ensureTenantASession();

    const integrations = await requestOk<{ webhook: { enabled: boolean; url: string; hasSecret: boolean } }>(
      '/api/integrations',
      jsonRequest('GET', owner.token),
    );
    expect(integrations.webhook).toMatchObject({ enabled: false, url: '', hasSecret: false });

    const rejectedWebhook = await expectStatus('/api/integrations', 400, jsonRequest('PATCH', owner.token, {
      webhook: { enabled: true, url: 'http://127.0.0.1:9999/webhook' },
    }));
    expect(rejectedWebhook.error).toMatch(/HTTPS|privado|localhost/);
    await expectStatus('/api/integrations', 400, jsonRequest('PATCH', owner.token, {
      webhook: { enabled: true, url: 'https://localhost/webhook' },
    }));
    await expectStatus('/api/integrations', 400, jsonRequest('PATCH', owner.token, {
      webhook: { enabled: true, url: 'https://127.0.0.1/webhook' },
    }));

    const ownerDeliveries = await requestOk<DeliveriesResult>('/api/integrations/deliveries', jsonRequest('GET', owner.token));
    const outsiderDeliveries = await requestOk<DeliveriesResult>('/api/integrations/deliveries', jsonRequest('GET', outsider.token));

    expect(ownerDeliveries.deliveries.some((delivery) => delivery.sessionId === session.id)).toBe(true);
    expect(outsiderDeliveries.deliveries).toHaveLength(0);

    const deliveryId = ownerDeliveries.deliveries.find((delivery) => delivery.sessionId === session.id)?.id;
    expect(deliveryId).toBeTruthy();

    await expectStatus(`/api/integrations/deliveries/${deliveryId}/retry`, 400, jsonRequest('POST', owner.token));
    await expectStatus(`/api/integrations/deliveries/${deliveryId}/retry`, 404, jsonRequest('POST', outsider.token));
    await expectStatus('/api/integrations/test-webhook', 400, jsonRequest('POST', owner.token, {}));
  });

  it('exports privacy data, writes audit logs and anonymizes on delete', async () => {
    const subject = await register(`privacy-${unique}@example.com`, 'Privacy Org');
    const createdAgent = await requestOk<AgentResult>('/api/agents', jsonRequest('POST', subject.token, agentPayload));
    await requestOk<SessionResult>('/api/sessions', jsonRequest('POST', subject.token, {
      agentName: createdAgent.agent.name,
      caller: 'Titular LGPD',
      duration: '00:30',
      summary: 'Sessão para exportação de privacidade.',
      transcript: 'Agente: Olá\nUsuário: Dados pessoais',
    }));

    const exported = await requestOk<{
      user: User;
      agents: StoredAgent[];
      sessions: SessionRecord[];
      auditLogs: Array<{ action: string; hash: string; metadata?: Record<string, unknown> }>;
    }>('/api/privacy/export', jsonRequest('GET', subject.token));

    expect(exported.user.privacyConsent?.version).toBeTruthy();
    expect(exported.agents).toHaveLength(1);
    expect(exported.sessions).toHaveLength(1);
    expect(exported.auditLogs.some((entry) => entry.action === 'privacy_export' && entry.hash)).toBe(true);
    expect(JSON.stringify(exported.auditLogs)).not.toContain('senha-segura-123');

    await expectStatus('/api/privacy/delete', 400, jsonRequest('POST', subject.token, { confirmation: 'WRONG' }));
    await requestOk<{ ok: boolean }>('/api/privacy/delete', jsonRequest('POST', subject.token, { confirmation: 'DELETE' }));
    await expectStatus('/api/me', 401, jsonRequest('GET', subject.token));
  });

  it('accepts valid Twilio signatures and finalizes a stopOnRisk voice flow', async () => {
    const { tenantA: owner } = await ensureTenants();
    const agent = await ensureTenantAAgent();
    const callId = crypto.randomUUID();
    const data = await readTestDatabase();
    data.telephonyCalls.push({
      id: callId,
      ownerId: owner.user.id,
      agentId: agent.id,
      agentName: agent.name,
      caller: 'Contato Twilio',
      to: '+5511999999999',
      from: '+5511888888888',
      provider: 'twilio',
      status: 'queued',
      currentQuestionIndex: 1,
      transcriptItems: [{ role: 'agent', text: agent.questions[1].text }],
      structuredDraft: { extracted: [], triggeredRisks: [], requiredMissing: [] },
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await writeTestDatabase(data);

    const answerPath = `/api/twilio/voice/${callId}/answer`;
    const answer = await requestRaw<string>(answerPath, twilioRequest(answerPath, { SpeechResult: 'Sim, risco urgente' }));
    expect(answer.response.status).toBe(200);
    expect(String(answer.payload)).toContain('prioridade alta');

    const sessions = await requestOk<SessionsResult>('/api/sessions', jsonRequest('GET', owner.token));
    const twilioSession = sessions.sessions.find((session) => session.caller === 'Contato Twilio');
    expect(twilioSession?.riskLevel).toBe('Alto');
  });
});

describe('Birth Voices API rate limiting', () => {
  it('rate limits Twilio webhook traffic before signature validation', async () => {
    const limited = await startApiTestServer({ WEBHOOK_RATE_LIMIT_MAX: '1' });
    const previous = server;
    server = limited;
    try {
      await expectStatus('/api/twilio/status/rate-limit', 403, { method: 'POST', body: JSON.stringify({ CallStatus: 'completed' }), headers: { 'Content-Type': 'application/json' } });
      await expectStatus('/api/twilio/status/rate-limit', 429, { method: 'POST', body: JSON.stringify({ CallStatus: 'completed' }), headers: { 'Content-Type': 'application/json' } });
    } finally {
      await limited.stop();
      server = previous;
    }
  }, 30000);
});
