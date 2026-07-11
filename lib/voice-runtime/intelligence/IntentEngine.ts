import { IntentSnapshot } from '../types';
import { observability } from '../Observability';

export class IntentEngine {
  public analyzeIntent(sessionId: string, text: string, currentContext: string): IntentSnapshot {
    // Emulação da identificação de intenções.
    // Em produção, usa o histórico e o contexto via LLM para extrair a intenção real (não apenas palavras chaves).

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

    observability.logEvent(sessionId, 'INTENT_DETECTED', { intent: snapshot });
    
    return snapshot;
  }
}

export const intentEngine = new IntentEngine();
