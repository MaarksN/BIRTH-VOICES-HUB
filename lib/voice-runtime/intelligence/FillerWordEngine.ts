import { observability } from '../Observability';

export class FillerWordEngine {
  public detectFillerWords(sessionId: string, transcript: string) {
    const fillerWords = ['é', 'ahn', 'tipo', 'então', 'hum', 'certo', 'né', 'ok', 'assim', 'bom'];
    const words = transcript.toLowerCase().split(/\s+/);
    
    let count = 0;
    words.forEach(w => {
      const cleanWord = w.replace(/[.,!?]/g, '');
      if (fillerWords.includes(cleanWord)) {
        count++;
      }
    });

    if (count > 0) {
      observability.logEvent(sessionId, 'FILLER_WORDS_DETECTED', { count, context: 'Turno de usuário' });
    }

    return count;
  }
}

export const fillerWordEngine = new FillerWordEngine();
