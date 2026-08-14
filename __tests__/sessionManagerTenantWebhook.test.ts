import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  logEvent: vi.fn(),
  initializeLatency: vi.fn(),
  clearLatency: vi.fn(),
  initializeMemory: vi.fn(),
  clearMemory: vi.fn(),
  createSessionStreams: vi.fn(),
  cleanupStream: vi.fn(),
}));

vi.mock('../lib/voice-runtime/Observability', () => ({
  observability: {
    logEvent: mocks.logEvent,
    startSpan: vi.fn(),
    endSpan: vi.fn(),
  },
}));

vi.mock('../lib/voice-runtime/LatencyMonitor', () => ({
  latencyMonitor: {
    initialize: mocks.initializeLatency,
    clear: mocks.clearLatency,
    recordProviderUsed: vi.fn(),
    recordMetric: vi.fn(),
  },
}));

vi.mock('../lib/voice-runtime/MemoryPipeline', () => ({
  memoryPipeline: {
    initialize: mocks.initializeMemory,
    clear: mocks.clearMemory,
    addTurn: vi.fn(),
    getContext: vi.fn(),
  },
}));

vi.mock('../lib/voice-runtime/StreamingEngine', () => ({
  streamingEngine: {
    createSessionStreams: mocks.createSessionStreams,
    cleanup: mocks.cleanupStream,
    writeInput: vi.fn(),
    writeOutput: vi.fn(),
  },
}));

vi.mock('../lib/voice-runtime/AudioPipeline', () => ({
  audioPipeline: { processInputChunk: vi.fn() },
}));

vi.mock('../lib/voice-runtime/FailoverEngine', () => ({
  failoverEngine: { executeWithFailover: vi.fn() },
}));

vi.mock('../src/services/webhook.service.js', () => ({
  webhookService: { dispatch: mocks.dispatch },
}));

vi.mock('../src/services/settingService.js', () => ({
  getAiConsent: vi.fn(),
}));

import { SessionManager } from '../lib/voice-runtime/SessionManager';
import type { AgentRuntimeConfig } from '../lib/voice-runtime/types';

const config: AgentRuntimeConfig = {
  providerStt: 'Deepgram',
  providerLlm: 'GoogleGemini',
  providerTts: 'ElevenLabs',
  model: 'gemini-test',
  fallbacks: [],
  timeoutMs: 5000,
  retryCount: 1,
  temperature: 0.2,
  silenceThresholdMs: 1000,
  speed: 1,
  bargeInEnabled: true,
  streamingEnabled: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dispatch.mockResolvedValue(undefined);
});

describe('SessionManager tenant-scoped webhook delivery', () => {
  it('dispatches call.completed with the real session tenant', () => {
    const manager = new SessionManager();
    const session = manager.createSession('agent-1', '+5511000000000', config, 'tenant-real');

    manager.endSession(session.sessionId);

    expect(mocks.dispatch).toHaveBeenCalledWith(
      'tenant-real',
      'call.completed',
      expect.objectContaining({
        sessionId: session.sessionId,
        agentId: 'agent-1',
      }),
    );
    expect(manager.getSession(session.sessionId)).toBeUndefined();
  });

  it('cleans up the session and records the error when webhook queueing fails', async () => {
    mocks.dispatch.mockRejectedValueOnce(new Error('queue unavailable'));
    const manager = new SessionManager();
    const session = manager.createSession('agent-1', '+5511000000000', config, 'tenant-real');

    expect(() => manager.endSession(session.sessionId)).not.toThrow();
    expect(manager.getSession(session.sessionId)).toBeUndefined();

    await vi.waitFor(() => {
      expect(mocks.logEvent).toHaveBeenCalledWith(
        session.sessionId,
        'WEBHOOK_DISPATCH_ERROR',
        { error: 'Error: queue unavailable' },
      );
    });
  });
});
