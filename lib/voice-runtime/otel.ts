import { trace, metrics, ValueType, Tracer, Meter, Attributes } from '@opentelemetry/api';

// Create a custom collector to store real-time spans and metrics for the frontend ObservabilityPage
export interface LocalSpan {
  id: string;
  name: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Attributes;
}

export interface LocalMetric {
  name: string;
  value: number;
  timestamp: number;
  attributes: Attributes;
}

class OpenTelemetryCollector {
  private spans: LocalSpan[] = [];
  private metrics: LocalMetric[] = [];
  private tracer: Tracer;
  private meter: Meter;

  constructor() {
    // Initialize the real OpenTelemetry APIs
    this.tracer = trace.getTracer('birth-voices-runtime', '1.0.0');
    this.meter = metrics.getMeter('birth-voices-metrics', '1.0.0');
  }

  public getTracer(): Tracer {
    return this.tracer;
  }

  public getMeter(): Meter {
    return this.meter;
  }

  // Record a span locally for dashboard display
  public startLocalSpan(name: string, sessionId: string, attributes: Attributes = {}): string {
    const spanId = `span-${Date.now()}-${this.spans.length}`;
    const localSpan: LocalSpan = {
      id: spanId,
      name,
      sessionId,
      startTime: Date.now(),
      attributes
    };
    this.spans.push(localSpan);
    
    // Also trigger OpenTelemetry API trace
    const otelSpan = this.tracer.startSpan(name, {
      attributes: { sessionId, ...attributes }
    });
    // Set active context or store it
    otelSpan.end(); // close API span immediately for simplicity in our synchronous engines

    return spanId;
  }

  public endLocalSpan(spanId: string, additionalAttributes: Attributes = {}) {
    const span = this.spans.find(s => s.id === spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.attributes = { ...span.attributes, ...additionalAttributes };
      
      // Record duration metric via OTEL Meter API
      const durationHistogram = this.meter.createHistogram('engine_latency_ms', {
        description: 'Latency of core engine execution',
        unit: 'ms',
        valueType: ValueType.INT
      });
      durationHistogram.record(span.duration, { engine: span.name, sessionId: span.sessionId });
      
      // Store local metric
      this.recordLocalMetric('engine_latency_ms', span.duration, { engine: span.name, sessionId: span.sessionId });
    }
  }

  public recordLocalMetric(name: string, value: number, attributes: Attributes = {}) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      attributes
    });

    // Clean up older records to avoid memory bloating
    if (this.metrics.length > 1000) this.metrics.shift();
    if (this.spans.length > 500) this.spans.shift();
  }

  public getSpans(): LocalSpan[] {
    return this.spans;
  }

  public getMetrics(): LocalMetric[] {
    return this.metrics;
  }

  public clear() {
    this.spans = [];
    this.metrics = [];
  }
}

export const otelCollector = new OpenTelemetryCollector();
