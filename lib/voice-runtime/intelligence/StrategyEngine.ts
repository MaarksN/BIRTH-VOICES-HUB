import { StrategyProfile, SessionIntelligence } from '../types';
import { observability } from '../Observability';
import { otelCollector } from '../otel';

export class StrategyEngine {
  public adaptStrategy(sessionId: string, intelligence: SessionIntelligence): StrategyProfile {
    const spanId = otelCollector.startLocalSpan('StrategyEngine.adaptStrategy', sessionId);
    const strategy: StrategyProfile = intelligence.strategyProfile || {
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

    otelCollector.endLocalSpan(spanId, {
      tone: strategy.tone,
      empathyLevel: strategy.empathyLevel,
      depth: strategy.depth
    });

    otelCollector.recordLocalMetric('strategy_depth', strategy.depth === 'High' ? 100 : strategy.depth === 'Moderate' ? 50 : 25, { tone: strategy.tone, sessionId });

    return strategy;
  }
}

export const strategyEngine = new StrategyEngine();
