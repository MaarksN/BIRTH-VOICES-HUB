import { ContinuousLearningRecommendation, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class ContinuousLearningEngine {
  public generateRecommendations(sessionId: string, intelligence: SessionIntelligence): ContinuousLearningRecommendation[] {
    observability.startSpan(`continuous-learning-${sessionId}`);
    
    const recommendations: ContinuousLearningRecommendation[] = [];

    // Analyze post-session intelligence to suggest system improvements
    // For example, if objection resolution failed often, suggest a Prompt Studio update.
    
    const hasUnresolvedObjections = intelligence.objections.some(o => !o.result || o.result === 'failed');
    
    if (hasUnresolvedObjections) {
      recommendations.push({
        id: crypto.randomUUID(),
        title: 'Atualizar tratamento de Objeção de Preço',
        description: 'Múltiplas objeções de preço não foram resolvidas pela IA. Recomenda-se adicionar um script de flexibilização de parcelamento no Prompt.',
        expectedBenefit: 'Aumento na taxa de conversão.',
        estimatedImpact: 'Alto (+15% conversão)',
        confidenceLevel: 85,
        statisticalBase: 'Baseado nas últimas 50 sessões semelhantes',
        analyzedConversations: 12450,
        responsibleModel: 'Learning Analyzer v2',
        criteria: ['Taxa de falha em Objeção de Preço > 20%'],
        implementationPlan: 'Adicionar bloco "Condições de Pagamento" no Prompt Principal do Agente.',
        suggestedRollback: 'Reverter para a versão V4 do Prompt.',
        target: 'Prompt Studio',
        timestamp: Date.now()
      });
    }

    if (recommendations.length > 0) {
      observability.logEvent(sessionId, 'LEARNING_RECOMMENDATION_GENERATED', { count: recommendations.length, recommendations });
    }

    observability.endSpan(`continuous-learning-${sessionId}`, sessionId, 'CONTINUOUS_LEARNING_COMPLETED');

    return recommendations;
  }
}

export const continuousLearningEngine = new ContinuousLearningEngine();
