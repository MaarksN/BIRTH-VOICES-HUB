import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/agentRepository.js', () => ({
  getAgent: vi.fn(),
}));

vi.mock('../src/repositories/sessionRepository.js', () => ({
  createPhoneSession: vi.fn(),
  updateSession: vi.fn(),
  findActiveOutboundSessionToNumber: vi.fn(),
  createOutboundPhoneSessionIfNoneInFlight: vi.fn(),
}));

vi.mock('../src/services/telephonyProvider.js', async () => {
  const actual = await vi.importActual<typeof import('../src/services/telephonyProvider.js')>(
    '../src/services/telephonyProvider.js',
  );
  return { ...actual, getTelephonyProvider: vi.fn() };
});

import { getAgent } from '../src/repositories/agentRepository.js';
import {
  createPhoneSession,
  updateSession,
  findActiveOutboundSessionToNumber,
  createOutboundPhoneSessionIfNoneInFlight,
} from '../src/repositories/sessionRepository.js';
import { getTelephonyProvider } from '../src/services/telephonyProvider.js';
import { TwilioNotConfiguredError } from '../src/services/twilioClient.js';
import {
  initiateOutboundCall,
  AgentNotFoundError,
  DuplicateCallError,
} from '../src/services/outboundCallService.js';

const mockGetAgent = vi.mocked(getAgent);
const mockCreatePhoneSession = vi.mocked(createPhoneSession);
const mockUpdateSession = vi.mocked(updateSession);
const mockFindActiveOutbound = vi.mocked(findActiveOutboundSessionToNumber);
const mockCreateOutboundPhoneSession = vi.mocked(createOutboundPhoneSessionIfNoneInFlight);
const mockGetTelephonyProvider = vi.mocked(getTelephonyProvider);

const mockPlaceCall = vi.fn();
const mockAssertConfigured = vi.fn();

type Agent = Awaited<ReturnType<typeof getAgent>>;
type Session = Awaited<ReturnType<typeof createPhoneSession>>;

function agent(overrides: Partial<NonNullable<Agent>> = {}): NonNullable<Agent> {
  return {
    id: 'agent-1',
    tenantId: 'tenant-1',
    userId: null,
    name: 'Catarina SDR',
    model: 'gemini',
    configuration: {},
    phoneNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as NonNullable<Agent>;
}

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    tenantId: 'tenant-1',
    userId: null,
    agentId: 'agent-1',
    channel: 'phone',
    status: 'active',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Session;
}

function request(overrides: Partial<Parameters<typeof initiateOutboundCall>[0]> = {}) {
  return {
    tenantId: 'tenant-1',
    agentId: 'agent-1',
    targetNumber: '+5511999998888',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAssertConfigured.mockImplementation(() => {});
  mockGetTelephonyProvider.mockReturnValue({
    name: 'test-provider',
    assertConfigured: mockAssertConfigured,
    placeCall: mockPlaceCall,
  });
  mockGetAgent.mockResolvedValue(agent());
  mockFindActiveOutbound.mockResolvedValue(null);
  mockCreatePhoneSession.mockResolvedValue(session());
  mockCreateOutboundPhoneSession.mockResolvedValue({ session: session(), inFlight: false });
  mockPlaceCall.mockResolvedValue({ callId: 'CA999', status: 'queued', from: '+5511333333333' });
});

describe('outboundCallService.initiateOutboundCall', () => {
  it('rejects an agent belonging to another tenant without dialing', async () => {
    mockGetAgent.mockResolvedValue(null);

    await expect(initiateOutboundCall(request())).rejects.toBeInstanceOf(AgentNotFoundError);
    expect(mockPlaceCall).not.toHaveBeenCalled();
    expect(mockCreateOutboundPhoneSession).not.toHaveBeenCalled();
  });

  it('refuses to dial a number that already has a call in flight', async () => {
    mockCreateOutboundPhoneSession.mockResolvedValue({ session: session({ id: 'sess-earlier' }), inFlight: true });

    await expect(initiateOutboundCall(request())).rejects.toBeInstanceOf(DuplicateCallError);
    expect(mockPlaceCall).not.toHaveBeenCalled();
  });

  it('does not create a session when the deployment cannot place calls', async () => {
    mockAssertConfigured.mockImplementation(() => {
      throw new TwilioNotConfiguredError('faltando TWILIO_FROM_NUMBER');
    });

    await expect(initiateOutboundCall(request())).rejects.toBeInstanceOf(TwilioNotConfiguredError);
    expect(mockCreateOutboundPhoneSession).not.toHaveBeenCalled();
  });

  it('asks the provider to dial, threading the session id through for the media callback', async () => {
    const result = await initiateOutboundCall(request({ context: { name: 'João' } }));

    expect(result).toEqual({ sessionId: 'sess-1', callSid: 'CA999', status: 'queued' });
    expect(mockPlaceCall).toHaveBeenCalledWith({ to: '+5511999998888', sessionId: 'sess-1' });
  });

  it('stores the session with the call context and callback URL before dialing', async () => {
    await initiateOutboundCall(request({ context: { leadId: 'lead-9' }, callbackUrl: 'https://crm.example.com/hook' }));

    expect(mockCreateOutboundPhoneSession).toHaveBeenCalledWith(
      'tenant-1',
      'agent-1',
      '+5511999998888',
      expect.objectContaining({
        direction: 'outbound',
        to: '+5511999998888',
        context: { leadId: 'lead-9' },
        callbackUrl: 'https://crm.example.com/hook',
      }),
    );
  });

  it('persists the call id and caller ID as soon as the provider accepts the call', async () => {
    await initiateOutboundCall(request());

    expect(mockUpdateSession).toHaveBeenCalledWith(
      'sess-1',
      expect.objectContaining({
        metadata: expect.objectContaining({ callSid: 'CA999', from: '+5511333333333' }),
      }),
    );
  });

  it('releases the session when the provider rejects the call, so the number is not blocked', async () => {
    mockPlaceCall.mockRejectedValue(new Error('provider: invalid destination'));

    await expect(initiateOutboundCall(request())).rejects.toThrow('provider: invalid destination');
    expect(mockUpdateSession).toHaveBeenCalledWith('sess-1', { status: 'failed' });
  });
});
