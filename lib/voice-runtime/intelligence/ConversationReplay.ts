import { RuntimeEvent } from '../types';
import { observability } from '../Observability';

export class ConversationReplayEngine {
  public generateReplayData(sessionId: string): { events: RuntimeEvent[], duration: number } {
    // Collects all logged events and audio chunks timestamps to allow a frontend player to "replay" the exact session
    
    const allEvents = observability.getEvents(sessionId);
    if (allEvents.length === 0) {
        return { events: [], duration: 0 };
    }

    const firstEvent = allEvents[0].timestamp;
    const lastEvent = allEvents[allEvents.length - 1].timestamp;

    return {
      events: allEvents,
      duration: lastEvent - firstEvent
    };
  }
}

export const conversationReplay = new ConversationReplayEngine();
