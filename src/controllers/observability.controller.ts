import { Request, Response } from 'express';
import { otelCollector } from '../../lib/voice-runtime/otel.js';

export function observabilityMetricsHandler(_req: Request, res: Response) {
  res.json({ spans: otelCollector.getSpans(), metrics: otelCollector.getMetrics() });
}
