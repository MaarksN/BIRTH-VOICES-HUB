
import { trace } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: 'birth-voices-app',
});

export const tracer = trace.getTracer('birth-voices-runtime', '1.0.0');
