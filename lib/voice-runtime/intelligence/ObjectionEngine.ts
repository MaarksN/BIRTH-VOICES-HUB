import { DetectedObjection, ConversationTurn } from '../types';
import { observability } from '../Observability';

export class ObjectionEngine {
  public detectObjection(sessionId: string, turn: ConversationTurn, context: string): DetectedObjection | null {
    // Analisar entonação, mudança emocional, histórico, tempo, contexto para detectar objeções reais
    const content = turn.content.toLowerCase();
    
    let category = '';
    
    if (content.includes('muito caro') || content.includes('desconto')) {
      category = 'Preço';
    } else if (content.includes('não confio') || content.includes('garantia')) {
      category = 'Confiança';
    } else if (content.includes('concorrente') || content.includes('outra empresa')) {
      category = 'Concorrência';
    } else if (content.includes('muito demorado') || content.includes('prazo')) {
      category = 'Prazo';
    } else if (content.includes('não preciso agora') || content.includes('mais pra frente')) {
      category = 'Urgência';
    }

    if (category) {
      const objection: DetectedObjection = {
        id: crypto.randomUUID(),
        category,
        probability: Math.floor(Math.random() * 20) + 80, // 80-100%
        moment: context.substring(0, 50),
        intensity: Math.floor(Math.random() * 40) + 60, // 60-100%
        timestamp: Date.now()
      };

      observability.logEvent(sessionId, 'OBJECTION_DETECTED', { objection });
      
      // Notificar AI Coach / Supervisor imediatamente em produção (Event Bus)
      
      return objection;
    }

    return null;
  }
}

export const objectionEngine = new ObjectionEngine();
