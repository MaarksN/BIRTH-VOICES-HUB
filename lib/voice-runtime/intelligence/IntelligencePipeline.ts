import { SessionIntelligence, ConversationTurn } from '../types';
import { emotionEngine } from './EmotionEngine';
import { intentEngine } from './IntentEngine';
import { entityExtractionEngine } from './EntityExtraction';
import { contextEngine } from './ContextEngine';
import { qualityEngine } from './QualityEngine';
import { insightsEngine } from './InsightsEngine';
import { aiCoach } from './AICoach';
import { voiceQA } from './VoiceQA';
import { learningEngine } from './LearningEngine';
import { conversationAnalytics } from './ConversationAnalytics';
import { objectionEngine } from './ObjectionEngine';
import { summaryEngine } from './SummaryEngine';
import { actionExtractionEngine } from './ActionExtractionEngine';
import { complianceEngine } from './ComplianceEngine';
import { conversationScoreEngine } from './ConversationScoreEngine';
import { continuousLearningEngine } from './ContinuousLearningEngine';
import { observability } from '../Observability';

export class IntelligencePipeline {
  private intelligenceStore: Map<string, SessionIntelligence> = new Map();

  public initialize(sessionId: string) {
    this.intelligenceStore.set(sessionId, {
      emotionTimeline: [],
      intentTimeline: [],
      contextSummary: '',
      extractedEntities: [],
      objections: [],
      actions: [],
      complianceIssues: []
    });
  }

  public analyzeTurn(sessionId: string, turn: ConversationTurn, isAudio: boolean = false): ConversationTurn {
    const sessionData = this.intelligenceStore.get(sessionId);
    if (!sessionData) return turn;
    
    // We only perform deep analysis on user turns, but we might also analyze assistant for quality.
    if (turn.role === 'user') {
      observability.startSpan(`intelligence-analysis-${sessionId}-${turn.id}`);
      
      // 1. Emotion Engine (continuously)
      const emotions = emotionEngine.analyzeTurn(sessionId, turn.content);
      if (emotions.length > 0) {
        turn.emotions = emotions;
        sessionData.emotionTimeline.push(...emotions);
      }
      
      // 2. Intent Engine (understand real goal)
      const intent = intentEngine.analyzeIntent(sessionId, turn.content, sessionData.contextSummary);
      if (intent) {
        turn.intent = intent;
        
        // Detect Intent shift
        const lastIntent = sessionData.intentTimeline[sessionData.intentTimeline.length - 1];
        if (lastIntent && lastIntent.primaryIntent !== intent.primaryIntent) {
            observability.logEvent(sessionId, 'INTENT_SHIFT_DETECTED', { 
                from: lastIntent.primaryIntent, 
                to: intent.primaryIntent 
            });
        }
        sessionData.intentTimeline.push(intent);
      }

      // 3. Entity Extraction
      const entities = entityExtractionEngine.extractEntities(sessionId, turn.content);
      if (entities.length > 0) {
        turn.entities = entities;
        sessionData.extractedEntities.push(...entities);
      }
      
      // 4. Compliance Engine
      const complianceIssues = complianceEngine.detectComplianceIssues(sessionId, turn, entities);
      if (complianceIssues.length > 0) {
        turn.complianceIssues = complianceIssues;
        sessionData.complianceIssues.push(...complianceIssues);
      }

      // 5. Objection Detection
      const objection = objectionEngine.detectObjection(sessionId, turn, sessionData.contextSummary);
      if (objection) {
        if (!turn.objections) turn.objections = [];
        turn.objections.push(objection);
        sessionData.objections.push(objection);
      }

      // 6. Action Extraction
      const actions = actionExtractionEngine.extractActions(sessionId, turn);
      if (actions.length > 0) {
        if (!turn.actions) turn.actions = [];
        turn.actions.push(...actions);
        sessionData.actions.push(...actions);
      }

      // 7. Conversation Context Engine
      sessionData.contextSummary = contextEngine.updateContextSummary(sessionId, sessionData.contextSummary, [turn]);
      
      // 8. Summary Engine (Continuous)
      sessionData.summary = summaryEngine.updateSummaries(sessionId, sessionData.summary, [turn], sessionData);
      
      // Real-time AI Coach triggers
      aiCoach.suggestImprovements(sessionId, sessionData);

      observability.endSpan(`intelligence-analysis-${sessionId}-${turn.id}`, sessionId, 'INTELLIGENCE_ANALYSIS_COMPLETED');
    }

    return turn;
  }
  
  public evaluateSessionEnd(sessionId: string) {
    const sessionData = this.intelligenceStore.get(sessionId);
    if (!sessionData) return;

    observability.startSpan(`session-end-eval-${sessionId}`);
    
    // Process post-session intelligence
    qualityEngine.evaluateQuality(sessionId, sessionData);
    insightsEngine.generateInsights(sessionId, sessionData);
    voiceQA.auditSession(sessionId, sessionData);
    learningEngine.extractLearnings(sessionId, sessionData);
    conversationAnalytics.aggregateMetrics(sessionId, sessionData);
    
    // New engines
    sessionData.score = conversationScoreEngine.calculateScore(sessionId, sessionData);
    sessionData.learningRecommendations = continuousLearningEngine.generateRecommendations(sessionId, sessionData);

    observability.endSpan(`session-end-eval-${sessionId}`, sessionId, 'SESSION_END_INTELLIGENCE_COMPLETED');
  }

  public getIntelligence(sessionId: string): SessionIntelligence | undefined {
    return this.intelligenceStore.get(sessionId);
  }
}

export const intelligencePipeline = new IntelligencePipeline();
