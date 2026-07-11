import { InterruptionEvent, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class InterruptionEngine {
  public handleInterruption(sessionId: string, intelligence: SessionIntelligence): InterruptionEvent {
    // Determine type of interruption based on the turn and recent emotions
    // Mocking the analysis
    const isEmotional = intelligence.emotionTimeline[intelligence.emotionTimeline.length - 1]?.name === 'Ansiedade';
    
    const event: InterruptionEvent = {
      id: crypto.randomUUID(),
      category: isEmotional ? 'emotional' : 'collaborative',
      impact: isEmotional ? 'Requer acalmar o cliente' : 'Usuário acrescentando contexto',
      timestamp: Date.now()
    };

    if (!intelligence.interruptions) intelligence.interruptions = [];
    intelligence.interruptions.push(event);

    observability.logEvent(sessionId, 'INTERRUPTION_DETECTED', { event });
    
    // Na prática: Atualizar contexto, emoção, intenção, estratégia
    
    return event;
  }
}

export const interruptionEngine = new InterruptionEngine();
