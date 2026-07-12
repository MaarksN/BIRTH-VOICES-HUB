import { SessionIntelligence } from '../types';
import { observability } from '../Observability';

export interface ConversationInsight {
  id: string;
  type: 'risco' | 'oportunidade' | 'melhoria' | 'alerta';
  description: string;
  confidence: number;
  timestamp: number;
}

export class InsightsEngine {
  public generateInsights(sessionId: string, intelligence: SessionIntelligence): ConversationInsight[] {
    const insights: ConversationInsight[] = [];
    
    // Na prática, um LLM analisaria o summary e os timelines para gerar insights acionáveis
    
    if (intelligence.emotionTimeline.some(e => e.name === 'Frustração' && e.intensity > 85)) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'risco',
        description: 'Cliente apresentou alto pico de frustração. Recomenda-se acompanhamento humano (callback).',
        confidence: 92,
        timestamp: Date.now()
      });
    }

    if (intelligence.intentTimeline.some(i => i.primaryIntent === 'Comprar' || i.primaryIntent === 'Agendar consulta')) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'oportunidade',
        description: 'Intenção comercial detectada forte. Possível upsell ou fechamento rápido.',
        confidence: 88,
        timestamp: Date.now()
      });
    }

    if (insights.length > 0) {
      observability.logEvent(sessionId, 'INSIGHTS_GENERATED', { count: insights.length, insights });
    }

    return insights;
  }
}

export const insightsEngine = new InsightsEngine();
