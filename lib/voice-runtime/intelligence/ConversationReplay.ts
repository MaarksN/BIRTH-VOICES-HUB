import { RuntimeEvent, ConversationTurn, EmotionSnapshot } from '../types';
import { observability } from '../Observability';
import { sessionManager } from '../SessionManager';

export interface ReplayData {
  sessionId: string;
  duration: number;
  events: RuntimeEvent[];
  transcript: ConversationTurn[];
  emotionalTimeline: EmotionSnapshot[];
}

export class ConversationReplayEngine {
  public generateReplayData(sessionId: string): ReplayData {
    const allEvents = observability.getEvents(sessionId);
    const session = sessionManager.getSession(sessionId);
    
    if (allEvents.length === 0 || !session) {
        return { sessionId, duration: 0, events: [], transcript: [], emotionalTimeline: [] };
    }

    const firstEvent = allEvents[0].timestamp;
    const lastEvent = allEvents[allEvents.length - 1].timestamp;

    return {
      sessionId,
      duration: lastEvent - firstEvent,
      events: allEvents,
      transcript: session.history || [],
      emotionalTimeline: session.intelligence?.emotionTimeline || []
    };
  }
}

export const conversationReplay = new ConversationReplayEngine();
