import { SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class QualityEngine {
  public evaluateQuality(sessionId: string, intelligence: SessionIntelligence): number {
    observability.startSpan(`quality-eval-${sessionId}`);
    
    // Na prática, avaliaria:
    // - Tempo de resposta (Latência)
    // - Score emocional do usuário (Melhorou ou piorou?)
    // - Resolução de intenções
    // - Naturalidade (baseado em interrupções e sobreposições)
    
    let baseScore = 80;

    // Se as emoções finais forem positivas, aumenta o score
    const recentEmotions = intelligence.emotionTimeline.slice(-3);
    const hasPositive = recentEmotions.some(e => e.name === 'Satisfação' || e.name === 'Confiança');
    const hasNegative = recentEmotions.some(e => e.name === 'Frustração' || e.name === 'Irritação');
    
    if (hasPositive) baseScore += 10;
    if (hasNegative) baseScore -= 15;

    // Se houve mudança brusca de intenções muitas vezes (confusão)
    if (intelligence.intentTimeline.length > 5) {
      baseScore -= 5;
    }

    const finalScore = Math.max(0, Math.min(100, baseScore));
    
    observability.endSpan(`quality-eval-${sessionId}`, sessionId, 'QUALITY_EVALUATED', { score: finalScore });
    return finalScore;
  }
}

export const qualityEngine = new QualityEngine();
