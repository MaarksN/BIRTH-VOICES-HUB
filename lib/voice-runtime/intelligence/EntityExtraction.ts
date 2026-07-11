import { ExtractedEntity } from '../types';
import { observability } from '../Observability';

export class EntityExtractionEngine {
  public extractEntities(sessionId: string, text: string): ExtractedEntity[] {
    // Emulação da extração de entidades (NER - Named Entity Recognition) usando Regex ou LLM.
    const entities: ExtractedEntity[] = [];
    
    // Regex simples para fins de mock
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g;

    let emailMatch;
    while ((emailMatch = emailRegex.exec(text)) !== null) {
      entities.push({
        type: 'Email',
        value: emailMatch[0],
        confidence: 99,
        timestamp: Date.now()
      });
    }

    let phoneMatch;
    while ((phoneMatch = phoneRegex.exec(text)) !== null) {
      entities.push({
        type: 'Telefone',
        value: phoneMatch[0],
        confidence: 95,
        timestamp: Date.now()
      });
    }

    if (entities.length > 0) {
      observability.logEvent(sessionId, 'ENTITIES_EXTRACTED', { entities });
    }

    return entities;
  }
}

export const entityExtractionEngine = new EntityExtractionEngine();
