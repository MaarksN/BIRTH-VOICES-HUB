import { TrustSnapshot, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class TrustEngine {
  public calculateTrust(sessionId: string, intelligence: SessionIntelligence): TrustSnapshot {
    // Starts at 50, fluctuates based on agreements, objections, etc.
    let level = 50;
    
    if (intelligence.objections.length === 0) level += 20;
    else level -= (intelligence.objections.length * 5);
    
    const latestEmotion = intelligence.emotionTimeline[intelligence.emotionTimeline.length - 1];
    if (latestEmotion && latestEmotion.name === 'Confiança') {
      level += 15;
    }

    level = Math.max(0, Math.min(100, level));

    const snapshot: TrustSnapshot = {
      level,
      indicators: {
        acceptance: 80,
        time: 120,
        tone: 90,
        objections: intelligence.objections.length,
        interruptions: intelligence.interruptions?.length || 0,
        agreements: 3,
        emotionalShifts: intelligence.emotionTimeline.length
      },
      timestamp: Date.now()
    };

    if (!intelligence.trustTimeline) intelligence.trustTimeline = [];
    intelligence.trustTimeline.push(snapshot);

    observability.logEvent(sessionId, 'TRUST_UPDATED', { level });

    return snapshot;
  }
}

export const trustEngine = new TrustEngine();
