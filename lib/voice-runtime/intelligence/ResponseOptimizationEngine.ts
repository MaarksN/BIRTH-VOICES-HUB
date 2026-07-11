import { OptimizationResult, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class ResponseOptimizationEngine {
  public optimize(sessionId: string, response: string, intelligence: SessionIntelligence): { optimized: string, result: OptimizationResult } {
    observability.startSpan(`response-optimization-${sessionId}`);
    
    let optimizedText = response;
    
    // Apply strategy profile
    const strategy = intelligence.strategyProfile;
    if (strategy?.responseLength === 'Short') {
       // Na prática, um prompt miniatura diminuiria a resposta aqui
       if (optimizedText.length > 100) {
          optimizedText = optimizedText.substring(0, 97) + '...';
       }
    }

    const result: OptimizationResult = {
      originalText: response,
      optimizedText: optimizedText,
      reasons: strategy?.responseLength === 'Short' ? ['Estratégia de resposta curta ativa (irritação/objetividade)'] : [],
      metricsChanged: {
        size: response.length - optimizedText.length,
        complexity: -1,
        empathy: 0,
        naturalness: 1,
        objectivity: 5,
        precision: 0
      },
      timestamp: Date.now()
    };
    
    if (response !== optimizedText) {
      observability.logEvent(sessionId, 'RESPONSE_OPTIMIZED', { result });
    }

    observability.endSpan(`response-optimization-${sessionId}`, sessionId, 'RESPONSE_OPTIMIZATION_COMPLETED');
    return { optimized: optimizedText, result };
  }
}

export const responseOptimizationEngine = new ResponseOptimizationEngine();
