import { SessionIntelligence } from '../types';
import { observability } from '../Observability';

export interface CoachingSuggestion {
  id: string;
  topic: string;
  suggestion: string;
  trigger: string;
  timestamp: number;
}

export class AICoach {
  public suggestImprovements(sessionId: string, intelligence: SessionIntelligence): CoachingSuggestion[] {
    const suggestions: CoachingSuggestion[] = [];

    // O AI Coach observa o desempenho do Agente de IA (ou humano se fosse um assistente copiloto)
    // Se a intenção do usuário mudou para "Cancelar" após um resumo do contexto:
    
    const lastIntent = intelligence.intentTimeline[intelligence.intentTimeline.length - 1];
    
    if (lastIntent?.primaryIntent === 'Cancelar') {
      suggestions.push({
        id: crypto.randomUUID(),
        topic: 'Retenção',
        suggestion: 'Tente oferecer alternativas de flexibilidade de pagamento antes de prosseguir com o cancelamento.',
        trigger: 'Intenção de Cancelamento',
        timestamp: Date.now()
      });
    }

    if (suggestions.length > 0) {
      observability.logEvent(sessionId, 'COACH_SUGGESTION', { count: suggestions.length, suggestions });
    }

    return suggestions;
  }
}

export const aiCoach = new AICoach();
