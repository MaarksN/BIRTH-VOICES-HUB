import { SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class LearningEngine {
  public extractLearnings(sessionId: string, intelligence: SessionIntelligence): void {
    // Processa a conversa após o encerramento para extrair Q&A, novos fatos sobre o cliente, ou falhas da IA
    // Esses dados iriam alimentar um Knowledge Base para fine-tuning ou RAG futuro.

    observability.startSpan(`learning-extraction-${sessionId}`);
    
    // Simulação
    if (intelligence.contextSummary.length > 50) {
      observability.logEvent(sessionId, 'LEARNING_EXTRACTED', { 
        concept: 'Knowledge Update',
        description: 'Contexto gerado e enviado para vetorização.'
      });
    }

    observability.endSpan(`learning-extraction-${sessionId}`, sessionId, 'LEARNING_COMPLETED');
  }
}

export const learningEngine = new LearningEngine();
