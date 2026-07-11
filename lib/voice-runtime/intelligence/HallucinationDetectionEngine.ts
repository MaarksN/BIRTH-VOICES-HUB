import { HallucinationAlert, ConversationTurn } from '../types';
import { observability } from '../Observability';

export class HallucinationDetectionEngine {
  public checkResponse(sessionId: string, turn: ConversationTurn, groundedKnowledge: any[]): HallucinationAlert | null {
    // Na prática: LLM-as-a-judge verifica se a resposta contradiz ou extrapola o conhecimento (groundedKnowledge)
    
    // Simulate hallucination detection
    let alert: HallucinationAlert | null = null;
    
    if (turn.content.includes('Garantimos 100%') && groundedKnowledge.length === 0) {
      alert = {
        id: crypto.randomUUID(),
        riskLevel: 'high',
        detectedIssue: 'Promessa de garantia absoluta sem base de conhecimento',
        actionTaken: 'blocked',
        timestamp: Date.now()
      };
      
      observability.logEvent(sessionId, 'HALLUCINATION_DETECTED', { alert });
    }

    return alert;
  }
}

export const hallucinationDetectionEngine = new HallucinationDetectionEngine();
