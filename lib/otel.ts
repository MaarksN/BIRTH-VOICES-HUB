
import { trace } from '@opentelemetry/api';

export const tracer = trace.getTracer('birth-voices-runtime', '1.0.0');
