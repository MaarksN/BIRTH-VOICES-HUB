import { IntentSnapshot } from '../types';
import { observability } from '../Observability';
import { otelCollector } from '../otel';

export interface IntentTransitionEvent {
  fromIntent: string;
  toIntent: string;
  confidence: number;
  timestamp: number;
}

export class IntentEngine {
  private lastIntents: Map<string, string> = new Map();

  public analyzeIntent(sessionId: string, text: string, currentContext: string): IntentSnapshot {
    const spanId = otelCollector.startLocalSpan('IntentEngine.analyzeIntent', sessionId, { currentContext });
    let primaryIntent = 'Fornecer informações';
    const textLower = text.toLowerCase();
    
    let score = 85;
    let confidence = 90;
    
    if (textLower.includes('agendar') || textLower.includes('marcar')) {
      primaryIntent = 'Agendar consulta';
      score = 98;
      confidence = 96;
    } else if (textLower.includes('cancelar')) {
      primaryIntent = 'Cancelar';
      score = 95;
      confidence = 92;
    } else if (textLower.includes('comprar') || textLower.includes('preço')) {
      primaryIntent = 'Comprar';
      score = 92;
      confidence = 89;
    } else if (textLower.includes('ajuda') || textLower.includes('suporte')) {
      primaryIntent = 'Solicitar suporte';
      score = 96;
      confidence = 94;
    } else if (textLower.length > 5) {
      // standard generic statement match strength
      score = Math.min(95, 75 + Math.min(20, textLower.length));
      confidence = Math.min(95, 80 + Math.min(15, textLower.length));
    }

    const snapshot: IntentSnapshot = {
      primaryIntent,
      score,
      confidence,
      context: currentContext || 'Sessão iniciada',
      timestamp: Date.now()
    };
    
    const previousIntent = this.lastIntents.get(sessionId);
    if (previousIntent && previousIntent !== primaryIntent) {
      const transition: IntentTransitionEvent = {
        fromIntent: previousIntent,
        toIntent: primaryIntent,
        confidence: snapshot.confidence,
        timestamp: snapshot.timestamp
      };
      observability.logEvent(sessionId, 'INTENT_TRANSITION', { transition });
    }
    
    this.lastIntents.set(sessionId, primaryIntent);

    observability.logEvent(sessionId, 'INTENT_DETECTED', { intent: snapshot });
    
    otelCollector.endLocalSpan(spanId, {
      primaryIntent,
      confidence,
      score
    });

    otelCollector.recordLocalMetric('intent_confidence', confidence, { primaryIntent, sessionId });
    
    return snapshot;
  }
}

export const intentEngine = new IntentEngine();
