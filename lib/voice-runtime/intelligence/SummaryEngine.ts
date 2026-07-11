import { ConversationSummary, ConversationTurn, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class SummaryEngine {
  public updateSummaries(sessionId: string, currentSummaries: ConversationSummary | undefined, newTurns: ConversationTurn[], intelligence: SessionIntelligence): ConversationSummary {
    observability.startSpan(`summary-generation-${sessionId}`);

    // Mocking robust summary generation based on LLM processing
    const isNew = !currentSummaries;
    const baseText = isNew ? "Resumo Inicial." : currentSummaries.executive;
    
    const newSummary: ConversationSummary = {
      executive: `${baseText} O cliente demonstrou interesse e forneceu dados básicos.`,
      technical: 'Processamento de STT e LLM ocorreu sem falhas, latência média 300ms.',
      commercial: 'Forte sinal comercial detectado. Cliente propenso a fechamento.',
      medical: 'Sem dados médicos relevantes na sessão.',
      legal: 'Consentimento da LGPD registrado e PII anonimizado.',
      financial: 'Nenhum dado financeiro transacionado.',
      oneSentence: 'Cliente iniciou contato com interesse comercial.',
      fiveLines: '1. Cliente ligou.\n2. IA atendeu e saudou.\n3. Cliente demonstrou interesse.\n4. IA extraiu informações.\n5. Próximos passos definidos.',
      detailed: 'Uma longa transcrição detalhada do que aconteceu baseada nos eventos e extrações.',
      structured: { status: 'in_progress', main_intent: 'Comprar' },
      json: { status: 'in_progress' },
      metadata: {
        objective: intelligence.intentTimeline[intelligence.intentTimeline.length - 1]?.primaryIntent || 'Indefinido',
        context: intelligence.contextSummary,
        mainPoints: ['Contato inicial', 'Extração de dados'],
        entities: intelligence.extractedEntities.map(e => e.value),
        dates: [new Date().toISOString()],
        pendencies: [],
        decisions: [],
        commitments: [],
        nextActions: [],
        toolsUsed: [],
        knowledgeConsulted: []
      }
    };

    observability.logEvent(sessionId, 'SUMMARY_UPDATED');
    observability.endSpan(`summary-generation-${sessionId}`, sessionId, 'SUMMARY_GENERATED');

    return newSummary;
  }
}

export const summaryEngine = new SummaryEngine();
