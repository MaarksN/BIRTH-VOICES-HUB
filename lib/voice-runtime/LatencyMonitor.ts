import { LatencyMetrics } from './types';
import { observability } from './Observability';

export class LatencyMonitor {
  private metrics: Map<string, LatencyMetrics> = new Map();

  public initialize(sessionId: string) {
    this.metrics.set(sessionId, {
      sttMs: 0,
      llmMs: 0,
      toolMs: 0,
      ttsMs: 0,
      streamingMs: 0,
      totalMs: 0
    });
  }

  public recordMetric(sessionId: string, stage: keyof LatencyMetrics, valueMs: number) {
    const sessionMetrics = this.metrics.get(sessionId);
    if (!sessionMetrics) return;

    sessionMetrics[stage] = valueMs;
    
    // Recalculate total
    sessionMetrics.totalMs = 
      sessionMetrics.sttMs + 
      sessionMetrics.llmMs + 
      sessionMetrics.toolMs + 
      sessionMetrics.ttsMs + 
      sessionMetrics.streamingMs;

    observability.logEvent(sessionId, 'LATENCY_UPDATED', { stage, valueMs, total: sessionMetrics.totalMs });
  }

  public getMetrics(sessionId: string): LatencyMetrics | undefined {
    return this.metrics.get(sessionId);
  }
}

export const latencyMonitor = new LatencyMonitor();
