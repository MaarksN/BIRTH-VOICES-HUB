import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../src/services/telephonyService.js', () => ({
  startCall: vi.fn(),
  handleTurn: vi.fn(),
  endCall: vi.fn(),
  messages: { reprompt: 'Pode repetir?', goodbye: 'Até logo.' },
}));

import { startCall, handleTurn, endCall } from '../src/services/telephonyService.js';
import { incomingCallHandler, gatherHandler, statusCallbackHandler } from '../src/controllers/telephony.controller.js';

const mockStartCall = vi.mocked(startCall);
const mockHandleTurn = vi.mocked(handleTurn);
const mockEndCall = vi.mocked(endCall);

function fakeRes() {
  const res = {
    type: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & { type: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('telephony.controller incomingCallHandler', () => {
  it('greets and opens a <Gather> when the number is configured', async () => {
    mockStartCall.mockResolvedValue({ configured: true, sessionId: 'sess-1', greeting: 'Olá, tudo bem?' });
    const req = { body: { CallSid: 'CA1', From: '+1000', To: '+15551234567' } } as unknown as Request;
    const res = fakeRes();

    await incomingCallHandler(req, res);

    expect(res.type).toHaveBeenCalledWith('text/xml');
    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain('<Gather');
    expect(xml).toContain('action="/api/telephony/twilio/gather?sessionId=sess-1"');
    expect(xml).toContain('Olá, tudo bem?');
  });

  it('says an apology and hangs up when the number is not configured', async () => {
    mockStartCall.mockResolvedValue({ configured: false });
    const req = { body: { CallSid: 'CA1', From: '+1000', To: '+19998887777' } } as unknown as Request;
    const res = fakeRes();

    await incomingCallHandler(req, res);

    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain('<Hangup');
    expect(xml).not.toContain('<Gather');
  });
});

describe('telephony.controller gatherHandler', () => {
  it('replies with the LLM answer and keeps the conversation going', async () => {
    mockHandleTurn.mockResolvedValue({ found: true, reply: 'Vou te ajudar com isso.' });
    const req = { query: { sessionId: 'sess-1' }, body: { SpeechResult: 'Tenho uma dúvida' } } as unknown as Request;
    const res = fakeRes();

    await gatherHandler(req, res);

    expect(mockHandleTurn).toHaveBeenCalledWith({ sessionId: 'sess-1', speechResult: 'Tenho uma dúvida' });
    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain('Vou te ajudar com isso.');
    expect(xml).toContain('<Gather');
  });

  it('re-prompts once instead of hanging up on empty speech', async () => {
    const req = { query: { sessionId: 'sess-1' }, body: {} } as unknown as Request;
    const res = fakeRes();

    await gatherHandler(req, res);

    expect(mockHandleTurn).not.toHaveBeenCalled();
    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain('Pode repetir?');
    expect(xml).toContain('<Gather');
  });

  it('hangs up gracefully when the session is gone', async () => {
    mockHandleTurn.mockResolvedValue({ found: false });
    const req = { query: { sessionId: 'sess-1' }, body: { SpeechResult: 'oi' } } as unknown as Request;
    const res = fakeRes();

    await gatherHandler(req, res);

    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain('<Hangup');
  });
});

describe('telephony.controller statusCallbackHandler', () => {
  it('finalizes the call and always returns 200', async () => {
    mockEndCall.mockResolvedValue({ found: true });
    const req = { body: { CallSid: 'CA1', CallStatus: 'completed', CallDuration: '90' } } as unknown as Request;
    const res = fakeRes();

    await statusCallbackHandler(req, res);

    expect(mockEndCall).toHaveBeenCalledWith({ callSid: 'CA1', status: 'completed', durationSeconds: 90 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does not throw and still returns 200 when endCall fails', async () => {
    mockEndCall.mockRejectedValue(new Error('db down'));
    const req = { body: { CallSid: 'CA1', CallStatus: 'completed', CallDuration: '90' } } as unknown as Request;
    const res = fakeRes();

    await statusCallbackHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
