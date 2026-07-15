import { ObjectiveProgress, SessionIntelligence } from '../types';
import { observability } from '../Observability';

export class ConversationObjectivesEngine {
  public updateProgress(sessionId: string, intelligence: SessionIntelligence): ObjectiveProgress[] {
    const objectives: ObjectiveProgress[] = intelligence.objectives || [
      {
        id: crypto.randomUUID(),
        type: 'primary',
        description: 'Entender a necessidade e oferecer a melhor solução',
        progressPercentage: 10,
        pendencies: ['Identificar intenção', 'Coletar dados', 'Propor solução'],
        completedSteps: [],
        timestamp: Date.now()
      }
    ];

    // Mock progress calculation based on intent and entities
    const currentObjective = objectives[0];
    
    const intentTimeline = intelligence.intentTimeline;
    if (intentTimeline.length > 0) {
      if (!currentObjective.completedSteps.includes('Identificar intenção')) {
        currentObjective.completedSteps.push('Identificar intenção');
        currentObjective.pendencies = currentObjective.pendencies.filter(p => p !== 'Identificar intenção');
        currentObjective.progressPercentage = 40;
      }
    }

    if (intelligence.extractedEntities.length > 0) {
       if (!currentObjective.completedSteps.includes('Coletar dados')) {
        currentObjective.completedSteps.push('Coletar dados');
        currentObjective.pendencies = currentObjective.pendencies.filter(p => p !== 'Coletar dados');
        currentObjective.progressPercentage = 70;
      }
    }

    intelligence.objectives = objectives;
    observability.logEvent(sessionId, 'OBJECTIVES_UPDATED', { objectives });

    return objectives;
  }
}

export const conversationObjectivesEngine = new ConversationObjectivesEngine();
