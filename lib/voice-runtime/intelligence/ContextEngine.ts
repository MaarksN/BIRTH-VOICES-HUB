import { ConversationTurn } from '../types';
import { observability } from '../Observability';

export class ContextEngine {
  public updateContextSummary(sessionId: string, currentSummary: string, newTurns: ConversationTurn[]): string {
    if (newTurns.length === 0) return currentSummary;
    
    // Na prática, invocaríamos um LLM otimizado para gerar um resumo incremental.
    // Para a simulação, anexamos as últimas intenções e mantemos curto.
    observability.startSpan(`context-summary-${sessionId}`);

    const newText = newTurns.map(t => `${t.role}: ${t.content}`).join(' | ');
    const updatedSummary = currentSummary ? 
      `${currentSummary}\n[Atualização]: O usuário abordou tópicos recentes e a IA forneceu resposta.` : 
      `Resumo inicial: O usuário iniciou o contato. Detalhes: ${newText.substring(0, 50)}...`;

    observability.endSpan(`context-summary-${sessionId}`, sessionId, 'CONTEXT_UPDATED', { summaryLength: updatedSummary.length });
    
    return updatedSummary;
  }
}

export const contextEngine = new ContextEngine();
