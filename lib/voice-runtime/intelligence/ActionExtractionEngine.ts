import { ExtractedAction, ConversationTurn } from '../types';
import { observability } from '../Observability';

export class ActionExtractionEngine {
  public extractActions(sessionId: string, turn: ConversationTurn): ExtractedAction[] {
    const actions: ExtractedAction[] = [];
    const content = turn.content.toLowerCase();

    // Na prática, invocaríamos um LLM para extrair ações de forma estruturada.
    
    if (content.includes('retornar') || content.includes('ligar depois')) {
      actions.push({
        id: crypto.randomUUID(),
        description: 'Agendar retorno para o cliente',
        responsible: 'Agente Humano',
        priority: 'high',
        category: 'Follow-up',
        origin: turn.id,
        status: 'pending',
        relationships: [],
        timestamp: Date.now()
      });
    }

    if (content.includes('agendar') && content.includes('consulta')) {
        actions.push({
          id: crypto.randomUUID(),
          description: 'Atualizar agenda com nova consulta',
          responsible: 'Sistema Médico',
          priority: 'medium',
          category: 'Agendamento',
          origin: turn.id,
          status: 'pending',
          relationships: [],
          timestamp: Date.now()
        });
    }

    if (actions.length > 0) {
      observability.logEvent(sessionId, 'ACTIONS_EXTRACTED', { count: actions.length, actions });
    }

    return actions;
  }
}

export const actionExtractionEngine = new ActionExtractionEngine();
