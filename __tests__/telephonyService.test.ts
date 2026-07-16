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

vi.mock('../lib/voice-runtime/providers/LLMGateway.js', () => ({
  llmProviderGateway: { processRequest: vi.fn() },
}));

import { findAgentByPhoneNumber, findAgentById } from '../src/repositories/agentRepository.js';
import { createPhoneSession, findSessionById, updateSession, findActivePhoneSessionByCallSid } from '../src/repositories/sessionRepository.js';
import { createCallLog } from '../src/services/callLogService.js';
import { llmProviderGateway } from '../lib/voice-runtime/providers/LLMGateway.js';
import { resolveAgent, startCall, handleTurn, endCall } from '../src/services/telephonyService.js';

const mockFindByPhone = vi.mocked(findAgentByPhoneNumber);
const mockFindById = vi.mocked(findAgentById);
const mockCreatePhoneSession = vi.mocked(createPhoneSession);
const mockFindSessionById = vi.mocked(findSessionById);
const mockUpdateSession = vi.mocked(updateSession);
const mockFindActiveByCallSid = vi.mocked(findActivePhoneSessionByCallSid);
const mockCreateCallLog = vi.mocked(createCallLog);
const mockProcessRequest = vi.mocked(llmProviderGateway.processRequest);

type Agent = Awaited<ReturnType<typeof findAgentById>>;
type Session = Awaited<ReturnType<typeof findSessionById>>;

function agent(overrides: Partial<NonNullable<Agent>> = {}): NonNullable<Agent> {
  return {
    id: 'agent-1',
    tenantId: 'tenant-1',
    userId: null,
    name: 'Catarina Triagem',
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

    const result = await handleTurn({ sessionId: 'sess-1', speechResult: 'Estou com dúvidas sobre o pré-natal' });

    expect(result).toEqual({ found: true, reply: 'Claro, posso ajudar.' });
    expect(mockProcessRequest).toHaveBeenCalledWith('Estou com dúvidas sobre o pré-natal', 'GoogleGemini', 'Seja breve.');

    const persistedMetadata = mockUpdateSession.mock.calls[0][1].metadata as { turns: Array<{ role: string; content: string }> };
    expect(persistedMetadata.turns.map((t) => t.role)).toEqual(['user', 'assistant']);
    expect(persistedMetadata.turns[1].content).toBe('Claro, posso ajudar.');
  });
});

describe('telephonyService.endCall', () => {
  it('does nothing when no active session matches the CallSid', async () => {
    mockFindActiveByCallSid.mockResolvedValue(null);
    const result = await endCall({ callSid: 'CA-missing', status: 'completed', durationSeconds: 42 });
    expect(result).toEqual({ found: false });
    expect(mockCreateCallLog).not.toHaveBeenCalled();
  });

  it('marks the session completed and writes a CallLog with a real duration and agent name', async () => {
    mockFindActiveByCallSid.mockResolvedValue(session());
    mockFindById.mockResolvedValue(agent({ name: 'Catarina Triagem' }));

    await endCall({ callSid: 'CA123', status: 'completed', durationSeconds: 135 });

    expect(mockUpdateSession).toHaveBeenCalledWith('sess-1', { status: 'completed' });
    expect(mockCreateCallLog).toHaveBeenCalledWith('tenant-1', null, expect.objectContaining({
      duration: '02:15',
      status: 'Concluído',
      agent: 'Catarina Triagem',
    }));
  });
});
