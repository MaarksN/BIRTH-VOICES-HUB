import { VoiceSession, ConversationTurn } from '../types';
import { observability } from '../Observability';
import { intentEngine } from './IntentEngine';

export class ConversationOrchestrator {
  public processIncomingTurn(session: VoiceSession, turn: ConversationTurn): ConversationTurn {
    // Basic multi-agent orchestration logic based on intent
    const intent = intentEngine.analyzeIntent(session.sessionId, turn.content, "General Context");
    turn.intent = intent;

    // Simulate Agent Routing Logic
    if (intent.primaryIntent === 'Triage' && session.agentId !== 'agent_triage') {
        observability.logEvent(session.sessionId, 'AGENT_HANDOFF', { from: session.agentId, to: 'agent_triage' });
        session.agentId = 'agent_triage';
        session.model = 'gemini-2.5-flash';
    } else if (intent.primaryIntent === 'Scheduling' && session.agentId !== 'agent_scheduler') {
        observability.logEvent(session.sessionId, 'AGENT_HANDOFF', { from: session.agentId, to: 'agent_scheduler' });
        session.agentId = 'agent_scheduler';
        session.model = 'gpt-4o-mini'; // Different agent might use different LLM provider
        session.provider = 'OpenAI';
    }

    return turn;
  }

  public processOutgoingTurn(_session: VoiceSession, turn: ConversationTurn): ConversationTurn {
    return turn;
  }
}

export const conversationOrchestrator = new ConversationOrchestrator();
