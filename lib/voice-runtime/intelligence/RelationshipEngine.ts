import { RelationshipProfile, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class RelationshipEngine {
  public updateRelationship(sessionId: string, intelligence: SessionIntelligence): RelationshipProfile {
    let profile: RelationshipProfile = intelligence.relationshipProfile || {
      preferences: [],
      history: [],
      interests: [],
      dates: [],
      events: [],
      products: [],
      family: [],
      company: '',
      role: '',
      specialty: '',
      lastUpdated: 0
    };

    // Extract knowledge from entities
    intelligence.extractedEntities.forEach(e => {
      if (e.type === 'Empresa' && !profile.company) profile.company = e.value;
      if (e.type === 'Cargo' && !profile.role) profile.role = e.value;
      if (e.type === 'Produto' && !profile.products.includes(e.value)) profile.products.push(e.value);
    });

    profile.lastUpdated = Date.now();

    intelligence.relationshipProfile = profile;
    observability.logEvent(sessionId, 'RELATIONSHIP_UPDATED', { profile });

    return profile;
  }
}

export const relationshipEngine = new RelationshipEngine();
