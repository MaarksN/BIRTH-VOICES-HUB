import { LiveDecision, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class LiveDecisionEngine {
  public evaluate(sessionId: string, intelligence: SessionIntelligence): LiveDecision | null {
    observability.startSpan(`live-decision-${sessionId}`);
    
    let decision: LiveDecision | null = null;
    
    // Simulate real-time decision logic based on current state
    const latestEmotion = intelligence.emotionTimeline[intelligence.emotionTimeline.length - 1];
    
    if (latestEmotion && latestEmotion.name === 'Irritação' && latestEmotion.intensity > 80) {
      decision = {
        id: crypto.randomUUID(),
        action: 'Diminuir velocidade, Aumentar empatia, Reduzir complexidade',
        confidence: 95,
        justification: 'Cliente ficou irritado',
        impact: 'Alta prioridade na retenção emocional',
        origin: 'Emotion Engine',
        engine: 'Live Decision Engine',
        model: 'DecisionTree v2',
        timestamp: Date.now()
      };
    } else if (intelligence.intentTimeline[intelligence.intentTimeline.length - 1]?.primaryIntent === 'Solicitar suporte' && intelligence.objections.length > 2) {
      decision = {
        id: crypto.randomUUID(),
        action: 'Transferir para atendimento humano especializado',
        confidence: 90,
        justification: 'Cliente precisa de ajuda com múltiplas objeções não resolvidas',
        impact: 'Garantir CSAT',
        origin: 'Intent Engine + Objection Engine',
        engine: 'Live Decision Engine',
        model: 'DecisionTree v2',
        timestamp: Date.now()
      };
    }

    if (decision) {
      if (!intelligence.liveDecisions) intelligence.liveDecisions = [];
      intelligence.liveDecisions.push(decision);
      observability.logEvent(sessionId, 'LIVE_DECISION_MADE', { decision });
    }

    observability.endSpan(`live-decision-${sessionId}`, sessionId, 'LIVE_DECISION_COMPLETED');
    return decision;
  }
}

export const liveDecisionEngine = new LiveDecisionEngine();
