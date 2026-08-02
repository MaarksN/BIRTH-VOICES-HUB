import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/agentRepository.js', () => ({
  findAgentByPhoneNumber: vi.fn(),
  findAgentById: vi.fn(),
}));

vi.mock('../src/repositories/sessionRepository.js', () => ({
  createPhoneSession: vi.fn(),
  findSessionById: vi.fn(),
  updateSession: vi.fn(),
  findActivePhoneSessionByCallSid: vi.fn(),
}));

vi.mock('../src/services/callLogService.js', () => ({
  createCallLog: vi.fn(),
}));

// Not just spying: the real module builds a BullMQ Queue at import time, which would try to reach
// Redis from a unit test.
vi.mock('../src/services/webhook.service.js', () => ({
  webhookService: { dispatch: vi.fn() },
}));

vi.mock('../lib/voice-runtime/providers/LLMGateway.js', () => ({
  llmProviderGateway: { processRequest: vi.fn() },
}));

import { findAgentByPhoneNumber, findAgentById } from '../src/repositories/agentRepository.js';
import { createPhoneSession, findSessionById, updateSession, findActivePhoneSessionByCallSid } from '../src/repositories/sessionRepository.js';
import { createCallLog } from '../src/services/callLogService.js';
import { webhookService } from '../src/services/webhook.service.js';
import { llmProviderGateway } from '../lib/voice-runtime/providers/LLMGateway.js';
import { resolveAgent, startCall, handleTurn, endCall, startOutboundCall } from '../src/services/telephonyService.js';

const mockFindByPhone = vi.mocked(findAgentByPhoneNumber);
const mockFindById = vi.mocked(findAgentById);
const mockCreatePhoneSession = vi.mocked(createPhoneSession);
const mockFindSessionById = vi.mocked(findSessionById);
const mockUpdateSession = vi.mocked(updateSession);
const mockFindActiveByCallSid = vi.mocked(findActivePhoneSessionByCallSid);
const mockCreateCallLog = vi.mocked(createCallLog);
const mockDispatch = vi.mocked(webhookService.dispatch);
const mockProcessRequest = vi.mocked(llmProviderGateway.processRequest);

type Agent = Awaited<ReturnType<typeof findAgentById>>;
type Session = Awaited<ReturnType<typeof findSessionById>>;

function agent(overrides: Partial<NonNullable<Agent>> = {}): NonNullable<Agent> {
  return {
    id: 'agent-1',
    tenantId: 'tenant-1',
    userId: null,
    name: 'Catarina Atendimento',
    model: 'gemini',
    configuration: {},
    phoneNumber: '+15551234567',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as NonNullable<Agent>;
}

function session(overrides: Partial<NonNullable<Session>> = {}): NonNullable<Session> {
  return {
    id: 'sess-1',
    tenantId: 'tenant-1',
    userId: null,
    agentId: 'agent-1',
    channel: 'phone',
    status: 'active',
    metadata: { callSid: 'CA123', from: '+1000', to: '+15551234567', turns: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as NonNullable<Session>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('telephonyService.resolveAgent', () => {
  it('resolves by phone number first', async () => {
    mockFindByPhone.mockResolvedValue(agent());
    const result = await resolveAgent('+15551234567');
    expect(result?.id).toBe('agent-1');
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('falls back to DEFAULT_AGENT_ID when no number match exists', async () => {
    mockFindByPhone.mockResolvedValue(null);
    mockFindById.mockResolvedValue(agent({ id: 'default-agent' }));
    process.env.DEFAULT_AGENT_ID = 'default-agent';

    const result = await resolveAgent('+19998887777');
    expect(result?.id).toBe('default-agent');
    expect(mockFindById).toHaveBeenCalledWith('default-agent');
    delete process.env.DEFAULT_AGENT_ID;
  });

  it('returns null when nothing matches and no default is configured', async () => {
    mockFindByPhone.mockResolvedValue(null);
    delete process.env.DEFAULT_AGENT_ID;

    const result = await resolveAgent('+19998887777');
    expect(result).toBeNull();
  });
});

describe('telephonyService.startCall', () => {
  it('reports unconfigured for an unmapped number instead of throwing', async () => {
    mockFindByPhone.mockResolvedValue(null);
    delete process.env.DEFAULT_AGENT_ID;

    const result = await startCall({ callSid: 'CA1', from: '+1000', to: '+19998887777' });
    expect(result).toEqual({ configured: false });
    expect(mockCreatePhoneSession).not.toHaveBeenCalled();
  });

  it('creates a phone session scoped to the resolved agent tenant', async () => {
    mockFindByPhone.mockResolvedValue(agent({ configuration: { greeting: 'Oi, tudo bem?' } }));
    mockCreatePhoneSession.mockResolvedValue(session());

    const result = await startCall({ callSid: 'CA1', from: '+1000', to: '+15551234567' });
    expect(result).toEqual({ configured: true, sessionId: 'sess-1', greeting: 'Oi, tudo bem?' });
    expect(mockCreatePhoneSession).toHaveBeenCalledWith('tenant-1', 'agent-1', expect.objectContaining({ callSid: 'CA1' }));
  });
});

describe('telephonyService.handleTurn', () => {
  it('returns not-found when the session no longer exists', async () => {
    mockFindSessionById.mockResolvedValue(null);
    const result = await handleTurn({ sessionId: 'missing', speechResult: 'oi' });
    expect(result).toEqual({ found: false });
    expect(mockProcessRequest).not.toHaveBeenCalled();
  });

  it('appends both turns and persists them, using the agent system prompt', async () => {
    mockFindSessionById.mockResolvedValue(session());
    mockFindById.mockResolvedValue(agent({ configuration: { systemPrompt: 'Seja breve.' } }));
    mockProcessRequest.mockResolvedValue({
      text: 'Claro, posso ajudar.',
      providerUsed: 'GoogleGemini',
      latencyMs: 10,
      tokensUsed: 5,
      costUSD: 0,
      fromFallback: false,
    });

    const result = await handleTurn({ sessionId: 'sess-1', speechResult: 'Estou com dúvidas sobre o orçamento' });

    expect(result).toEqual({ found: true, reply: 'Claro, posso ajudar.' });
    expect(mockProcessRequest).toHaveBeenCalledWith('Estou com dúvidas sobre o orçamento', 'GoogleGemini', 'Seja breve.');

    const persistedMetadata = mockUpdateSession.mock.calls[0][1].metadata as { turns: Array<{ role: string; content: string }> };
    expect(persistedMetadata.turns.map((t) => t.role)).toEqual(['user', 'assistant']);
    expect(persistedMetadata.turns[1].content).toBe('Claro, posso ajudar.');
  });
});

describe('telephonyService.startOutboundCall', () => {
  it('returns not-found when the pre-created session is gone', async () => {
    mockFindSessionById.mockResolvedValue(null);
    const result = await startOutboundCall({ sessionId: 'missing', callSid: 'CA9' });
    expect(result).toEqual({ found: false });
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it('personalises the greeting from the call context', async () => {
    mockFindSessionById.mockResolvedValue(
      session({ metadata: { direction: 'outbound', callSid: null, from: '+1000', to: '+2000', context: { name: 'João' }, turns: [] } }),
    );
    mockFindById.mockResolvedValue(agent({ configuration: { outboundGreeting: 'Olá {{name}}, tem um minuto?' } }));

    const result = await startOutboundCall({ sessionId: 'sess-1', callSid: 'CA9' });

    expect(result).toEqual({ found: true, greeting: 'Olá João, tem um minuto?' });
  });

  it('drops unknown placeholders instead of speaking them aloud', async () => {
    mockFindSessionById.mockResolvedValue(
      session({ metadata: { direction: 'outbound', callSid: null, from: '+1000', to: '+2000', context: {}, turns: [] } }),
    );
    mockFindById.mockResolvedValue(agent({ configuration: { outboundGreeting: 'Olá {{name}}, tudo bem?' } }));

    const result = await startOutboundCall({ sessionId: 'sess-1', callSid: 'CA9' });

    expect(result).toEqual({ found: true, greeting: 'Olá , tudo bem?' });
  });

  it('records the greeting as the first transcript turn and backfills the CallSid', async () => {
    mockFindSessionById.mockResolvedValue(
      session({ metadata: { direction: 'outbound', callSid: null, from: '+1000', to: '+2000', context: {}, turns: [] } }),
    );
    mockFindById.mockResolvedValue(agent({ configuration: { outboundGreeting: 'Bom dia!' } }));

    await startOutboundCall({ sessionId: 'sess-1', callSid: 'CA9' });

    const persisted = mockUpdateSession.mock.calls[0][1].metadata as unknown as {
      callSid: string;
      turns: Array<{ role: string; content: string }>;
    };
    expect(persisted.callSid).toBe('CA9');
    expect(persisted.turns).toHaveLength(1);
    expect(persisted.turns[0]).toMatchObject({ role: 'assistant', content: 'Bom dia!' });
  });
});

describe('telephonyService.endCall', () => {
  it('does nothing when no active session matches the CallSid', async () => {
    mockFindActiveByCallSid.mockResolvedValue(null);
    const result = await endCall({ callSid: 'CA-missing', status: 'completed', durationSeconds: 42 });
    expect(result).toEqual({ found: false });
    expect(mockCreateCallLog).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('marks the session completed and writes a CallLog with a real duration and agent name', async () => {
    mockFindActiveByCallSid.mockResolvedValue(session());
    mockFindById.mockResolvedValue(agent({ name: 'Catarina Atendimento' }));

    await endCall({ callSid: 'CA123', status: 'completed', durationSeconds: 135 });

    expect(mockUpdateSession).toHaveBeenCalledWith('sess-1', { status: 'completed' });
    expect(mockCreateCallLog).toHaveBeenCalledWith('tenant-1', null, expect.objectContaining({
      duration: '02:15',
      status: 'Concluído',
      agent: 'Catarina Atendimento',
    }));
  });

  it('dispatches agent.call.ended to the callback URL the call was placed with', async () => {
    mockFindActiveByCallSid.mockResolvedValue(
      session({
        metadata: {
          direction: 'outbound',
          callSid: 'CA123',
          from: '+1000',
          to: '+2000',
          callbackUrl: 'https://crm.example.com/hook',
          context: { leadId: 'lead-9' },
          turns: [{ role: 'assistant', content: 'Bom dia!', timestamp: 1 }],
        },
      }),
    );
    mockFindById.mockResolvedValue(agent({ name: 'Catarina SDR' }));

    await endCall({ callSid: 'CA123', status: 'completed', durationSeconds: 60 });

    expect(mockDispatch).toHaveBeenCalledWith(
      'tenant-1',
      'agent.call.ended',
      expect.objectContaining({
        sessionId: 'sess-1',
        direction: 'outbound',
        outcome: 'Concluído',
        context: { leadId: 'lead-9' },
        transcript: [{ role: 'assistant', content: 'Bom dia!', timestamp: 1 }],
      }),
      'https://crm.example.com/hook',
    );
  });

  // The outcome an autonomous dialer most needs to record, and the one that never reaches the
  // TwiML webhook — it exists only because the CallSid is stored at dial time.
  it('still reports an unanswered call, with an empty transcript', async () => {
    mockFindActiveByCallSid.mockResolvedValue(
      session({
        metadata: { direction: 'outbound', callSid: 'CA123', from: '+1000', to: '+2000', context: {}, turns: [] },
      }),
    );
    mockFindById.mockResolvedValue(agent());

    await endCall({ callSid: 'CA123', status: 'no-answer', durationSeconds: 0 });

    expect(mockUpdateSession).toHaveBeenCalledWith('sess-1', { status: 'failed' });
    expect(mockDispatch).toHaveBeenCalledWith(
      'tenant-1',
      'agent.call.ended',
      expect.objectContaining({ status: 'no-answer', outcome: 'Não atendida', durationSeconds: 0, transcript: [] }),
      undefined,
    );
  });
});
