import { AgentConfig, IntegrationSettings, RuntimeStatus, SessionRecord, StoredAgent, StructuredDraft, TelephonyCall, User } from '../types';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(payload?.error || 'Falha na comunicação com o servidor.', response.status);
  }

  return payload as T;
}

export const api = {
  status: () => apiFetch<RuntimeStatus>('/api/status'),

  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (companyName: string, email: string, password: string, consentSource = 'register_form') =>
    apiFetch<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ companyName, email, password, consentSource }),
    }),

  logout: () =>
    apiFetch<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  me: () => apiFetch<{ user: User }>('/api/me'),

  updateMe: (updates: Partial<User>) =>
    apiFetch<{ user: User }>('/api/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  listAgents: () => apiFetch<{ agents: StoredAgent[] }>('/api/agents'),

  createAgent: (config: AgentConfig) =>
    apiFetch<{ agent: StoredAgent }>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  updateAgent: (id: string, config: AgentConfig) =>
    apiFetch<{ agent: StoredAgent }>(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  deleteAgent: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/agents/${id}`, {
      method: 'DELETE',
    }),

  listSessions: () => apiFetch<{ sessions: SessionRecord[] }>('/api/sessions'),

  createSession: (session: Omit<SessionRecord, 'id' | 'dateTime'> & Partial<Pick<SessionRecord, 'id' | 'dateTime'>>) =>
    apiFetch<{ session: SessionRecord }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    }),

  analyzeAndSaveSession: (payload: {
    agentId: string;
    caller: string;
    transcriptItems: Array<{ role: 'agent' | 'user'; text: string }>;
    durationSeconds: number;
    structuredDraft?: StructuredDraft;
  }) =>
    apiFetch<{ session: SessionRecord }>('/api/sessions/analyze-and-save', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getIntegrations: () => apiFetch<IntegrationSettings>('/api/integrations'),

  listIntegrationDeliveries: () =>
    apiFetch<{ deliveries: NonNullable<SessionRecord['integrationDelivery']>[] }>('/api/integrations/deliveries'),

  retryIntegrationDelivery: (deliveryId: string) =>
    apiFetch<{ delivery: NonNullable<SessionRecord['integrationDelivery']> }>(`/api/integrations/deliveries/${deliveryId}/retry`, {
      method: 'POST',
    }),

  updateIntegrations: (settings: {
    webhook: {
      enabled: boolean;
      url: string;
      secret?: string;
    };
  }) =>
    apiFetch<IntegrationSettings>('/api/integrations', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),

  testWebhook: (payload?: { url?: string; secret?: string }) =>
    apiFetch<{ delivery: NonNullable<SessionRecord['integrationDelivery']>; responseBody?: string }>('/api/integrations/test-webhook', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  listTelephonyCalls: () => apiFetch<{ calls: TelephonyCall[] }>('/api/telephony/calls'),

  startTelephonyCall: (payload: { agentId: string; to: string; caller?: string }) =>
    apiFetch<{ call: TelephonyCall }>('/api/telephony/calls', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
