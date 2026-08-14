import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  getAiConsent: vi.fn(),
  startLocalSpan: vi.fn(() => 'span-1'),
  endLocalSpan: vi.fn(),
  recordLocalMetric: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: { generateContent: mocks.generateContent },
  })),
}));

vi.mock('../src/services/settingService.js', () => ({
  getAiConsent: mocks.getAiConsent,
}));

vi.mock('../lib/voice-runtime/otel', () => ({
  SYSTEM_TENANT_ID: 'system',
  otelCollector: {
    startLocalSpan: mocks.startLocalSpan,
    endLocalSpan: mocks.endLocalSpan,
    recordLocalMetric: mocks.recordLocalMetric,
  },
}));

import { llmProviderGateway } from '../lib/voice-runtime/providers/LLMGateway';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.startLocalSpan.mockReturnValue('span-1');
  mocks.getAiConsent.mockResolvedValue({
    granted: true,
    grantedAt: '2026-08-14T12:00:00.000Z',
    revokedAt: null,
    grantedByUserId: 'user-1',
  });
  process.env.OPENAI_API_KEY = 'test-openai';
  process.env.GEMINI_API_KEY = 'test-gemini';
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
});

describe('LLMProviderGateway failover honesty', () => {
  it('really falls back to Gemini when the preferred provider fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Unavailable',
    }));
    mocks.generateContent.mockResolvedValue({
      text: 'Resposta do fallback Gemini',
      usageMetadata: { totalTokenCount: 12 },
    });

    const result = await llmProviderGateway.processRequest(
      'Preciso de ajuda',
      'OpenAI',
      'Seja breve.',
      'tenant-failover',
    );

    expect(result.text).toBe('Resposta do fallback Gemini');
    expect(result.providerUsed).toBe('GoogleGemini');
    expect(result.fromFallback).toBe(true);
    expect(mocks.generateContent).toHaveBeenCalledOnce();
  });

  it('reports NONE instead of pretending Gemini succeeded when every provider fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Unavailable',
    }));
    mocks.generateContent.mockRejectedValue(new Error('Gemini unavailable'));

    const result = await llmProviderGateway.processRequest(
      'Preciso de ajuda',
      'OpenAI',
      'Seja breve.',
      'tenant-total-failure',
    );

    expect(result.providerUsed).toBe('NONE');
    expect(result.costUSD).toBe(0);
    expect(result.fromFallback).toBe(true);
    expect(result.text).toContain('instabilidade técnica');
  });
});
