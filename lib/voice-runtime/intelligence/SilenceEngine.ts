import { SilenceEvent, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class SilenceEngine {
  public analyzeSilence(sessionId: string, durationMs: number, intelligence: SessionIntelligence): SilenceEvent {
    
    let category: SilenceEvent['category'] = 'short';
    if (durationMs > 5000) category = 'long';
    else if (durationMs > 2000) category = 'medium';

    // Context analysis for the silence
    const lastIntent = intelligence.intentTimeline[intelligence.intentTimeline.length - 1];
    if (durationMs > 10000) {
      category = 'abandonment';
    } else if (lastIntent?.primaryIntent === 'Dúvida') {
      category = 'reflective';
    }

    const event: SilenceEvent = {
      id: crypto.randomUUID(),
      durationMs,
      category,
      context: 'Silêncio detectado após a última resposta',
      impact: 'Pode indicar processamento de informação ou abandono',
      probability: 85,
      timestamp: Date.now()
    };

    if (!intelligence.silences) intelligence.silences = [];
    intelligence.silences.push(event);

    observability.logEvent(sessionId, 'SILENCE_DETECTED', { event });
    
    return event;
  }
}

export const silenceEngine = new SilenceEngine();
