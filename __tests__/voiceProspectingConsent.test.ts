import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAiConsent: vi.fn(),
  claimIdempotencyKey: vi.fn(),
  buildIdempotencyKey: vi.fn(() => 'idempotency:test'),
}));

vi.mock('../src/services/settingService.js', () => ({
  getAiConsent: mocks.getAiConsent,
}));

vi.mock('../src/features/prospecting/lib/webhookIdempotency.js', () => ({
  buildAtlasGROutboundIdempotencyKey: mocks.buildIdempotencyKey,
  claimIdempotencyKey: mocks.claimIdempotencyKey,
}));

import {
  ExternalAiConsentRequiredError,
  voiceProspectingService,
} from '../src/features/prospecting/services/voice.service';

const payload = {
  phone_number: '+5511999999999',
  name: 'Contato Teste',
  company: 'Empresa Teste',
  lead_id: 'lead-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BLAND_API_KEY = 'test-key';
  process.env.BLAND_WEBHOOK_TOKEN = 'callback-token';
  process.env.WEBHOOK_BASE_URL = 'https://birth.example.com';
  process.env.ATLASGR_TENANT_ID = 'tenant-atlas';
  delete process.env.BLAND_RECORD_CALLS;
  mocks.claimIdempotencyKey.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BLAND_API_KEY;
  delete process.env.BLAND_WEBHOOK_TOKEN;
  delete process.env.WEBHOOK_BASE_URL;
  delete process.env.ATLASGR_TENANT_ID;
  delete process.env.BLAND_RECORD_CALLS;
});

describe('VoiceProspectingService privacy boundary', () => {
  it('blocks before idempotency/network when the configured tenant has no external-AI consent', async () => {
    mocks.getAiConsent.mockResolvedValue({
      granted: false,
      grantedAt: null,
      revokedAt: null,
      grantedByUserId: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(voiceProspectingService.triggerOutboundCall(payload)).rejects.toBeInstanceOf(
      ExternalAiConsentRequiredError,
    );

    expect(mocks.getAiConsent).toHaveBeenCalledWith('tenant-atlas');
    expect(mocks.claimIdempotencyKey).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a consented call with recording disabled by default', async () => {
    mocks.getAiConsent.mockResolvedValue({
      granted: true,
      grantedAt: '2026-08-14T12:00:00.000Z',
      revokedAt: null,
      grantedByUserId: 'user-1',
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ call_id: 'call-1', status: 'queued' })),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await voiceProspectingService.triggerOutboundCall(payload);

    expect(result).toMatchObject({ success: true, duplicate: false, callId: 'call-1', status: 'queued' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.record).toBe(false);
    expect(body.webhook).toBe('https://birth.example.com/api/webhooks/bland/callback-token');
  });

  it('allows recording only when the deployment explicitly opts in', async () => {
    process.env.BLAND_RECORD_CALLS = 'true';
    mocks.getAiConsent.mockResolvedValue({
      granted: true,
      grantedAt: '2026-08-14T12:00:00.000Z',
      revokedAt: null,
      grantedByUserId: 'user-1',
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ call_id: 'call-2', status: 'queued' })),
    });
    vi.stubGlobal('fetch', fetchMock);

    await voiceProspectingService.triggerOutboundCall(payload);

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.record).toBe(true);
  });
});
