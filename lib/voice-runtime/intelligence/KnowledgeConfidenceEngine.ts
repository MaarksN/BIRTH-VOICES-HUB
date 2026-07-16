import { KnowledgeConfidence } from '../types';

export class KnowledgeConfidenceEngine {

  public evaluateKnowledge(query: string, availableDocuments: any[]): KnowledgeConfidence {
    // RAG Simulator: In a real scenario, this would query a vector DB (Pinecone, PgVector).
    // Due to sandbox constraints, we simulate semantic search over JSON.

    let bestMatchScore = 0;
    let snippetUsed = 'Não encontrei informações específicas sobre isso.';
    let documentName = 'Unknown';
    let isUpToDate = false;

    // Simple keyword simulation
    const lowerQuery = query.toLowerCase();

    for (const doc of availableDocuments) {
        if (lowerQuery.includes(doc.keyword) || doc.content.toLowerCase().includes(lowerQuery)) {
            bestMatchScore = 0.85; // Simulated high confidence
            snippetUsed = doc.content;
            documentName = doc.name;
            isUpToDate = true;
            break;
        }
    }

    return {
      source: 'Internal Knowledge Base',
      confidence: bestMatchScore,
      isUpToDate,
      document: documentName,
      version: 'v1.0',
      snippetUsed,
      embeddingsScore: bestMatchScore
    };
  }
}

export const knowledgeConfidenceEngine = new KnowledgeConfidenceEngine();
