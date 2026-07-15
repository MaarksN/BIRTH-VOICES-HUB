import { SpeechPattern, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export interface RawAudioInfo {
  text?: string;
  duration?: number;
  volume?: number;
  energy?: number;
}

export class SpeechPatternEngine {
  public analyzeAudio(sessionId: string, intelligence: SessionIntelligence, rawAudioInfo: RawAudioInfo): SpeechPattern {
    // Determine speed (WPM) based on raw text length if available, or a stable acoustic profile
    const text = rawAudioInfo?.text || '';
    const wordsCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const durationSec = rawAudioInfo?.duration || 4; // default duration
    
    // Conversational human average is around 130-150 words per minute.
    const calculatedSpeed = wordsCount > 0 
      ? Math.round(Math.min(220, Math.max(90, (wordsCount / durationSec) * 60)))
      : 135; 

    const volume = rawAudioInfo?.volume || 68; // standard conversational volume (dB)
    const energy = rawAudioInfo?.energy || (calculatedSpeed > 150 ? 80 : 60);

    const pattern: SpeechPattern = {
      speed: calculatedSpeed,
      rhythm: calculatedSpeed > 160 ? 'Rápido/Ansioso' : calculatedSpeed < 100 ? 'Lento/Pausado' : 'Constante',
      intonation: text.includes('?') ? 'Interrogativa' : text.includes('!') ? 'Expressiva' : 'Neutra',
      volume,
      energy,
      cadence: calculatedSpeed > 150 ? 'Rápida' : calculatedSpeed < 110 ? 'Lenta' : 'Moderada',
      breathing: calculatedSpeed > 165 ? 'Forte/Superficial' : 'Normal',
      hesitation: text.includes('...') || text.includes('hã') || text.includes('err') || text.includes('hum') ? 3 : 1,
      changes: calculatedSpeed > 160 ? ['Cliente acelerando'] : ['Estável'],
      timestamp: Date.now()
    };

    if (!intelligence.speechPatterns) intelligence.speechPatterns = [];
    intelligence.speechPatterns.push(pattern);

    observability.logEvent(sessionId, 'SPEECH_PATTERN_ANALYZED', { pattern });

    return pattern;
  }
}

export const speechPatternEngine = new SpeechPatternEngine();
