import { EmotionSnapshot } from '../types';
import { observability } from '../Observability';
import { otelCollector } from '../otel';

export interface EmotionalState {
  empathyScore: number;
  confidenceScore: number;
  frustrationScore: number;
}

export class EmotionEngine {
  private sessionStates: Map<string, EmotionalState> = new Map();

  public analyzeTurn(sessionId: string, text: string, audioData?: ArrayBuffer | Uint8Array): EmotionSnapshot[] {
    const spanId = otelCollector.startLocalSpan('EmotionEngine.analyzeTurn', sessionId, { textLength: text.length });
    const textLower = text.toLowerCase();
    
    // Deterministic Intensity score based on punctuation and word count
    let baseIntensity = 65;
    if (text.includes('!')) baseIntensity += 15;
    if (text.toUpperCase() === text && text.length > 5) baseIntensity += 15;
    if (textLower.includes('urgente') || textLower.includes('rápido') || textLower.includes('socorro')) baseIntensity += 10;
    const calculatedIntensity = Math.min(100, Math.max(30, baseIntensity));

    // Deterministic Confidence score based on hesitate words
    let baseConfidence = 85;
    if (textLower.includes('talvez') || textLower.includes('não sei') || textLower.includes('acho')) baseConfidence -= 25;
    if (textLower.includes('hã') || textLower.includes('err') || textLower.includes('hum')) baseConfidence -= 15;
    const calculatedConfidence = Math.min(100, Math.max(30, baseConfidence));
    
    let detectedEmotions: EmotionSnapshot[] = [];
    let state = this.sessionStates.get(sessionId) || { empathyScore: 50, confidenceScore: 50, frustrationScore: 0 };

    if (textLower.includes('obrigado') || textLower.includes('bom') || textLower.includes('ajudou') || textLower.includes('perfeito')) {
      detectedEmotions.push({
        name: 'Satisfação',
        intensity: calculatedIntensity,
        confidence: calculatedConfidence,
        timestamp: Date.now()
      });
      state.confidenceScore = Math.min(100, state.confidenceScore + 10);
      state.frustrationScore = Math.max(0, state.frustrationScore - 20);
    } else if (textLower.includes('problema') || textLower.includes('erro') || textLower.includes('não funciona') || textLower.includes('ruim') || textLower.includes('demora')) {
      detectedEmotions.push({
        name: 'Frustração',
        intensity: Math.min(100, calculatedIntensity + 10),
        confidence: calculatedConfidence,
        timestamp: Date.now()
      });
      state.frustrationScore = Math.min(100, state.frustrationScore + 30);
      state.confidenceScore = Math.max(0, state.confidenceScore - 15);
    } else {
      detectedEmotions.push({
        name: 'Neutro',
        intensity: Math.max(20, calculatedIntensity - 15),
        confidence: calculatedConfidence,
        timestamp: Date.now()
      });
    }
    
    // Calculate Empathy based on polite words
    let empathyDelta = 0;
    if (textLower.includes('por favor') || textLower.includes('gentileza') || textLower.includes('obrigado')) {
      empathyDelta = 8;
    } else if (textLower.includes('rápido') || textLower.includes('logo')) {
      empathyDelta = -4;
    } else {
      empathyDelta = 2; // steady slow positive progress
    }
    state.empathyScore = Math.min(100, Math.max(0, state.empathyScore + empathyDelta));
    
    this.sessionStates.set(sessionId, state);

    if (detectedEmotions.length > 0) {
       observability.logEvent(sessionId, 'EMOTION_DETECTED', { emotions: detectedEmotions, state });
    }
    
    otelCollector.endLocalSpan(spanId, {
      detectedEmotions: detectedEmotions.map(e => e.name),
      frustrationScore: state.frustrationScore,
      empathyScore: state.empathyScore
    });

    detectedEmotions.forEach(e => {
      otelCollector.recordLocalMetric('emotion_intensity', e.intensity, { emotion: e.name, sessionId });
    });
    
    return detectedEmotions;
  }
  
  public getSessionState(sessionId: string): EmotionalState {
    return this.sessionStates.get(sessionId) || { empathyScore: 50, confidenceScore: 50, frustrationScore: 0 };
  }
}

export const emotionEngine = new EmotionEngine();
