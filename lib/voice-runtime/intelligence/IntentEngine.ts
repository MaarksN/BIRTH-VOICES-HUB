import { IntentSnapshot } from '../types';
import { observability } from '../Observability';

export interface IntentTransitionEvent {
  fromIntent: string;
  toIntent: string;
  confidence: number;
  timestamp: number;
}

export class IntentEngine {
  private lastIntents: Map<string, string> = new Map();

  public analyzeIntent(sessionId: string, text: string, currentContext: string): IntentSnapshot {
    let primaryIntent = 'Fornecer informações';
    const textLower = text.toLowerCase();
    
    if (textLower.includes('agendar') || textLower.includes('marcar')) {
      primaryIntent = 'Agendar consulta';
    } else if (textLower.includes('cancelar')) {
      primaryIntent = 'Cancelar';
    } else if (textLower.includes('comprar') || textLower.includes('preço')) {
      primaryIntent = 'Comprar';
    } else if (textLower.includes('ajuda') || textLower.includes('suporte')) {
      primaryIntent = 'Solicitar suporte';
    }

    const snapshot: IntentSnapshot = {
      primaryIntent,
      score: Math.floor(Math.random() * 20) + 80, // 80-100%
      confidence: Math.floor(Math.random() * 15) + 85, // 85-100%
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
    
    return snapshot;
  }
}

export const intentEngine = new IntentEngine();
