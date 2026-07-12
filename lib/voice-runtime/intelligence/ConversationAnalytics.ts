import { SessionIntelligence } from '../types';
import { observability } from '../Observability';

export interface AnalyticsMetrics {
  totalTurns: number;
  averageEmotionIntensity: number;
  intentResolutionRate: number;
}

export class ConversationAnalytics {
  public aggregateMetrics(sessionId: string, intelligence: SessionIntelligence): AnalyticsMetrics {
    // Agrega as métricas da conversa para compor o Dashboard de Analytics corporativo.
    
    let totalIntensity = 0;
    intelligence.emotionTimeline.forEach(e => totalIntensity += e.intensity);
    
    const avgIntensity = intelligence.emotionTimeline.length > 0 ? (totalIntensity / intelligence.emotionTimeline.length) : 0;

    const metrics: AnalyticsMetrics = {
      totalTurns: intelligence.emotionTimeline.length, // approximation
      averageEmotionIntensity: avgIntensity,
      intentResolutionRate: 95 // Mocked value
    };

    observability.logEvent(sessionId, 'ANALYTICS_AGGREGATED', { metrics });

    return metrics;
  }
}

export const conversationAnalytics = new ConversationAnalytics();
