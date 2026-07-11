import { EmotionSnapshot } from '../types';
import { observability } from '../Observability';

export interface EmotionalState {
  empathyScore: number;
  confidenceScore: number;
  frustrationScore: number;
}

export class EmotionEngine {
  private sessionStates: Map<string, EmotionalState> = new Map();

  public analyzeTurn(sessionId: string, text: string, audioData?: ArrayBuffer | Uint8Array): EmotionSnapshot[] {
    const randomIntensity = Math.floor(Math.random() * 40) + 60; // 60-100%
    const randomConfidence = Math.floor(Math.random() * 30) + 70; // 70-100%
    
    let detectedEmotions: EmotionSnapshot[] = [];
    const textLower = text.toLowerCase();
    
    let state = this.sessionStates.get(sessionId) || { empathyScore: 50, confidenceScore: 50, frustrationScore: 0 };

    if (textLower.includes('obrigado') || textLower.includes('bom')) {
      detectedEmotions.push({
        name: 'Satisfação',
        intensity: randomIntensity,
        confidence: randomConfidence,
        timestamp: Date.now()
      });
      state.confidenceScore = Math.min(100, state.confidenceScore + 10);
      state.frustrationScore = Math.max(0, state.frustrationScore - 20);
    } else if (textLower.includes('problema') || textLower.includes('erro') || textLower.includes('não funciona')) {
      detectedEmotions.push({
        name: 'Frustração',
        intensity: randomIntensity + 10 > 100 ? 100 : randomIntensity + 10,
        confidence: randomConfidence,
        timestamp: Date.now()
      });
      state.frustrationScore = Math.min(100, state.frustrationScore + 30);
      state.confidenceScore = Math.max(0, state.confidenceScore - 15);
    } else {
      detectedEmotions.push({
        name: 'Neutro',
        intensity: randomIntensity - 20,
        confidence: randomConfidence,
        timestamp: Date.now()
      });
    }
    
    // Simulate Empathy from agent side or client side
    state.empathyScore = Math.min(100, Math.max(0, state.empathyScore + (Math.random() * 10 - 5)));
    
    this.sessionStates.set(sessionId, state);

    if (detectedEmotions.length > 0) {
       observability.logEvent(sessionId, 'EMOTION_DETECTED', { emotions: detectedEmotions, state });
    }
    
    return detectedEmotions;
  }
  
  public getSessionState(sessionId: string): EmotionalState {
    return this.sessionStates.get(sessionId) || { empathyScore: 50, confidenceScore: 50, frustrationScore: 0 };
  }
}

export const emotionEngine = new EmotionEngine();
