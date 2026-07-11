import { StrategyProfile, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class StrategyEngine {
  public adaptStrategy(sessionId: string, intelligence: SessionIntelligence): StrategyProfile {
    let strategy: StrategyProfile = intelligence.strategyProfile || {
      tone: 'Professional',
      depth: 'Moderate',
      languageComplexity: 'Standard',
      responseLength: 'Medium',
      empathyLevel: 'Standard',
      timestamp: Date.now()
    };

    // Analyze emotional timeline and silences to adapt strategy
    const latestEmotion = intelligence.emotionTimeline[intelligence.emotionTimeline.length - 1];
    
    if (latestEmotion) {
      if (latestEmotion.name === 'Ansiedade' || latestEmotion.name === 'Insegurança') {
        strategy.empathyLevel = 'High';
        strategy.tone = 'Comforting';
      } else if (latestEmotion.name === 'Irritação') {
        strategy.empathyLevel = 'High';
        strategy.responseLength = 'Short'; // Be objective
      } else if (latestEmotion.name === 'Confiança') {
        strategy.depth = 'High'; // Go deeper if client is confident
      }
    }

    intelligence.strategyProfile = strategy;
    observability.logEvent(sessionId, 'STRATEGY_ADAPTED', { strategy });

    return strategy;
  }
}

export const strategyEngine = new StrategyEngine();
