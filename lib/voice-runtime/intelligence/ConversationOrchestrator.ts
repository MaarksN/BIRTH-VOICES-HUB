import { ConversationTurn, VoiceSession } from '../types';
import { intelligencePipeline } from './IntelligencePipeline';
import { liveDecisionEngine } from './LiveDecisionEngine';
import { interruptionEngine } from './InterruptionEngine';
import { silenceEngine } from './SilenceEngine';
import { speechPatternEngine } from './SpeechPatternEngine';
import { fillerWordEngine } from './FillerWordEngine';
import { naturalnessEngine } from './NaturalnessEngine';
import { trustEngine } from './TrustEngine';
import { relationshipEngine } from './RelationshipEngine';
import { conversationObjectivesEngine } from './ConversationObjectivesEngine';
import { strategyEngine } from './StrategyEngine';
import { knowledgeConfidenceEngine } from './KnowledgeConfidenceEngine';
import { hallucinationDetectionEngine } from './HallucinationDetectionEngine';
import { responseOptimizationEngine } from './ResponseOptimizationEngine';
import { observability } from '../Observability';

export class ConversationOrchestrator {
  
  public processIncomingAudio(session: VoiceSession, audioData: any) {
    // Process audio patterns (speech pattern, filler words, etc)
    if (!session.intelligence) return;
    speechPatternEngine.analyzeAudio(session.sessionId, session.intelligence, audioData);
  }

  public processIncomingTurn(session: VoiceSession, turn: ConversationTurn) {
    observability.startSpan(`orchestrator-in-${session.sessionId}-${turn.id}`);
    
    if (!session.intelligence) {
      intelligencePipeline.initialize(session.sessionId);
      session.intelligence = intelligencePipeline.getIntelligence(session.sessionId);
    }
    const intelligence = session.intelligence!;

    // Analyze text specific (filler words)
    fillerWordEngine.detectFillerWords(session.sessionId, turn.content);

    // Standard Intelligence Pipeline (Emotion, Intent, Context, Extraction, etc)
    intelligencePipeline.analyzeTurn(session.sessionId, turn, false);

    // Trust & Relationship
    trustEngine.calculateTrust(session.sessionId, intelligence);
    relationshipEngine.updateRelationship(session.sessionId, intelligence);

    // Objectives & Strategy
    conversationObjectivesEngine.updateProgress(session.sessionId, intelligence);
    strategyEngine.adaptStrategy(session.sessionId, intelligence);

    // Live Decisions
    liveDecisionEngine.evaluate(session.sessionId, intelligence);

    observability.endSpan(`orchestrator-in-${session.sessionId}-${turn.id}`, session.sessionId, 'ORCHESTRATOR_IN_COMPLETED');
  }

  public processOutgoingTurn(session: VoiceSession, turn: ConversationTurn, groundedKnowledge: any[] = []): ConversationTurn {
    observability.startSpan(`orchestrator-out-${session.sessionId}-${turn.id}`);
    
    const intelligence = session.intelligence;
    if (!intelligence) return turn;

    // Evaluate Knowledge Confidence
    knowledgeConfidenceEngine.evaluateKnowledge(session.sessionId, turn.content, groundedKnowledge);

    // Check for hallucinations
    const alert = hallucinationDetectionEngine.checkResponse(session.sessionId, turn, groundedKnowledge);
    if (alert && alert.actionTaken === 'blocked') {
        turn.content = "Desculpe, eu preciso verificar essa informação. Um momento.";
    }

    // Optimize Response
    const optimization = responseOptimizationEngine.optimize(session.sessionId, turn.content, intelligence);
    turn.content = optimization.optimized;

    // Naturalness check (post-generation)
    naturalnessEngine.evaluate(session.sessionId, intelligence);

    observability.endSpan(`orchestrator-out-${session.sessionId}-${turn.id}`, session.sessionId, 'ORCHESTRATOR_OUT_COMPLETED');
    return turn;
  }

  public processSilence(session: VoiceSession, durationMs: number) {
    if (session.intelligence) {
      silenceEngine.analyzeSilence(session.sessionId, durationMs, session.intelligence);
    }
  }

  public processInterruption(session: VoiceSession) {
    if (session.intelligence) {
      interruptionEngine.handleInterruption(session.sessionId, session.intelligence);
    }
  }
}

export const conversationOrchestrator = new ConversationOrchestrator();
