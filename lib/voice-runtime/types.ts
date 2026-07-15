export type SessionState = 
  | 'Idle' 
  | 'Connecting' 
  | 'Listening' 
  | 'Thinking' 
  | 'Speaking' 
  | 'Executing Tool' 
  | 'Waiting' 
  | 'Transferring' 
  | 'Finished' 
  | 'Error';

export interface VoiceSession {
  sessionId: string;
  agentId: string;
  workspaceId: string;
  organizationId: string;
  projectId: string;
  callerId: string;
  channel: string;
  provider: string;
  status: SessionState;
  durationMs: number;
  latencyMs: number;
  model: string;
  language: string;
  region: string;
  history: ConversationTurn[];
  events: RuntimeEvent[];
  intelligence?: SessionIntelligence;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: Record<string, unknown>[];
  emotions?: EmotionSnapshot[];
  intent?: IntentSnapshot;
  entities?: ExtractedEntity[];
  objections?: DetectedObjection[];
  actions?: ExtractedAction[];
  complianceIssues?: ComplianceIssue[];
}

export interface RuntimeEvent {
  id: string;
  timestamp: number;
  type: string;
  payload: Record<string, unknown>;
  latency?: number;
}

// --- Memory Pipeline Types ---

export type MemoryLevel = 'immediate' | 'session' | 'persistent' | 'historical';

export interface MemoryNode {
  id: string;
  level: MemoryLevel;
  content: any;
  ttl: number | null; // null means infinite
  priority: number; // 0-100
  compressed: boolean;
  version: number;
  relationships: string[]; // IDs of related MemoryNodes
  timestamp: number;
}

export interface AgentRuntimeConfig {
  providerStt: string;
  providerLlm: string;
  providerTts: string;
  model: string;
  fallbacks: string[];
  timeoutMs: number;
  retryCount: number;
  temperature: number;
  silenceThresholdMs: number;
  speed: number;
  bargeInEnabled: boolean;
  streamingEnabled: boolean;
}

export interface LatencyMetrics {
  sttMs: number;
  llmMs: number;
  toolMs: number;
  ttsMs: number;
  streamingMs: number;
  totalMs: number;
}

export interface HealthMetrics {
  score: number;
  latency: number;
  audioLoss: number;
  reconnections: number;
  interruptions: number;
  failures: number;
  errors: number;
  uptime: number;
}

export interface AudioChunk {
  data: ArrayBuffer | Uint8Array;
  timestamp: number;
  isSpeech: boolean;
}

// --- Conversational Intelligence Types ---

export interface EmotionSnapshot {
  name: string;
  intensity: number;
  confidence: number;
  timestamp: number;
}

export interface IntentSnapshot {
  primaryIntent: string;
  score: number;
  confidence: number;
  context: string;
  timestamp: number;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  timestamp: number;
}

export interface DetectedObjection {
  id: string;
  category: string; // Preço, Prazo, Confiança, Concorrência, etc
  probability: number;
  moment: string;
  intensity: number;
  answerUsed?: string;
  result?: string;
  timestamp: number;
}

export interface ConversationSummary {
  executive: string;
  technical: string;
  commercial: string;
  medical: string;
  legal: string;
  financial: string;
  oneSentence: string;
  fiveLines: string;
  detailed: string;
  structured: any;
  json: any;
  metadata: {
    objective: string;
    context: string;
    mainPoints: string[];
    entities: string[];
    dates: string[];
    pendencies: string[];
    decisions: string[];
    commitments: string[];
    nextActions: string[];
    toolsUsed: string[];
    knowledgeConsulted: string[];
  }
}

export interface ExtractedAction {
  id: string;
  description: string;
  responsible: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: number;
  category: string;
  origin: string; // turn ID
  status: 'pending' | 'completed' | 'cancelled';
  relationships: string[];
  timestamp: number;
}

export interface ComplianceIssue {
  id: string;
  framework: string; // LGPD, HIPAA, PCI DSS, etc
  rule: string; // CPF exposto, Cartão, Senha, Dados médicos, etc
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionTaken: 'masked' | 'registered' | 'notified' | 'audited';
  evidence: string;
  timestamp: number;
}

export interface ConversationScore {
  overallScore: number;
  categories: {
    relationship: number;
    communication: number;
    efficiency: number;
    objective: number;
    context: number;
    performance: number;
    experience: number;
  };
  indicators: {
    empathy: number;
    naturalness: number;
    clarity: number;
    averageTime: number;
    precision: number;
    latency: number;
    interruptions: number;
    correctToolUsage: number;
    memory: number;
    knowledge: number;
    objective: number;
    conversion: number;
    resolution: number;
    continuity: number;
    confidence: number;
  };
  metrics: {
    efficiency: number;
    satisfaction: number;
    risk: number;
    success: number;
    confidence: number;
    performance: number;
  };
  explanation: string;
  comparison: string;
}

export interface ContinuousLearningRecommendation {
  id: string;
  title: string;
  description: string;
  expectedBenefit: string;
  estimatedImpact: string;
  confidenceLevel: number;
  statisticalBase: string;
  analyzedConversations: number;
  responsibleModel: string;
  criteria: string[];
  implementationPlan: string;
  suggestedRollback: string;
  target: 'Prompt Studio' | 'Voice Studio' | 'Analytics' | 'Supervisor' | 'Marketplace' | 'Agent OS' | 'AI Gateway';
  timestamp: number;
}

export interface LiveDecision {
  id: string;
  action: string;
  confidence: number;
  justification: string;
  impact: string;
  origin: string;
  engine: string;
  model: string;
  timestamp: number;
}

export interface InterruptionEvent {
  id: string;
  category: 'positive' | 'negative' | 'collaborative' | 'emotional' | 'technical' | 'doubt' | 'urgency';
  impact: string;
  timestamp: number;
}

export interface SilenceEvent {
  id: string;
  durationMs: number;
  category: 'short' | 'medium' | 'long' | 'emotional' | 'technical' | 'reflective' | 'abandonment';
  context: string;
  impact: string;
  probability: number;
  timestamp: number;
}

export interface SpeechPattern {
  speed: number;
  rhythm: string;
  intonation: string;
  volume: number;
  energy: number;
  cadence: string;
  breathing: string;
  hesitation: number;
  changes: string[];
  timestamp: number;
}

export interface TrustSnapshot {
  level: number;
  indicators: {
    acceptance: number;
    time: number;
    tone: number;
    objections: number;
    interruptions: number;
    agreements: number;
    emotionalShifts: number;
  };
  timestamp: number;
}

export interface RelationshipProfile {
  preferences: string[];
  history: string[];
  interests: string[];
  dates: string[];
  events: string[];
  products: string[];
  family: string[];
  company: string;
  role: string;
  specialty: string;
  lastUpdated: number;
}

export interface ObjectiveProgress {
  id: string;
  type: 'primary' | 'secondary' | 'alternative' | 'mandatory';
  description: string;
  progressPercentage: number;
  pendencies: string[];
  completedSteps: string[];
  timestamp: number;
}

export interface StrategyProfile {
  tone: string;
  depth: string;
  languageComplexity: string;
  responseLength: string;
  empathyLevel: string;
  timestamp: number;
}

export interface KnowledgeConfidence {
  source: string;
  confidence: number;
  isUpToDate: boolean;
  document: string;
  version: string;
  snippetUsed: string;
  embeddingsScore: number;
}

export interface HallucinationAlert {
  id: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedIssue: string;
  actionTaken: 'blocked' | 'consulted_knowledge' | 'consulted_tool' | 'requested_confirmation';
  timestamp: number;
}

export interface OptimizationResult {
  originalText: string;
  optimizedText: string;
  reasons: string[];
  metricsChanged: {
    size: number;
    complexity: number;
    empathy: number;
    naturalness: number;
    objectivity: number;
    precision: number;
  };
  timestamp: number;
}

export interface SessionIntelligence {
  emotionTimeline: EmotionSnapshot[];
  intentTimeline: IntentSnapshot[];
  contextSummary: string; // Legacy
  summary?: ConversationSummary;
  extractedEntities: ExtractedEntity[];
  objections: DetectedObjection[];
  actions: ExtractedAction[];
  complianceIssues: ComplianceIssue[];
  score?: ConversationScore;
  learningRecommendations?: ContinuousLearningRecommendation[];
  liveDecisions?: LiveDecision[];
  interruptions?: InterruptionEvent[];
  silences?: SilenceEvent[];
  speechPatterns?: SpeechPattern[];
  trustTimeline?: TrustSnapshot[];
  relationshipProfile?: RelationshipProfile;
  objectives?: ObjectiveProgress[];
  strategyProfile?: StrategyProfile;
  hallucinationAlerts?: HallucinationAlert[];
}
