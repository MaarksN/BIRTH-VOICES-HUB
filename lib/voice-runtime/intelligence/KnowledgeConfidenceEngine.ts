import { KnowledgeConfidence } from '../types';
import { observability } from '../Observability';

export interface KnowledgeDocument {
  name: string;
  [key: string]: unknown;
}

export class KnowledgeConfidenceEngine {
  public evaluateKnowledge(sessionId: string, text: string, sourceDocs: KnowledgeDocument[]): KnowledgeConfidence {
    const confidence: KnowledgeConfidence = {
      source: 'Internal Knowledge Base',
      confidence: sourceDocs.length > 0 ? 95 : 30, // Mocked confidence based on docs
      isUpToDate: true,
      document: sourceDocs.length > 0 ? sourceDocs[0].name : 'None',
      version: '1.0',
      snippetUsed: text.substring(0, 50),
      embeddingsScore: sourceDocs.length > 0 ? 0.89 : 0.2
    };

    if (confidence.confidence < 70) {
      observability.logEvent(sessionId, 'LOW_KNOWLEDGE_CONFIDENCE', { confidence });
      // Na prática: acionar fallback de resposta "Não encontrei informação"
    }

    return confidence;
  }
}

export const knowledgeConfidenceEngine = new KnowledgeConfidenceEngine();
