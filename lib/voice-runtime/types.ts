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
  toolCalls?: any[];
  emotions?: EmotionSnapshot[];
  intent?: IntentSnapshot;
  entities?: ExtractedEntity[];
}

export interface RuntimeEvent {
  id: string;
  timestamp: number;
  type: string;
  payload: any;
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

export interface SessionIntelligence {
  emotionTimeline: EmotionSnapshot[];
  intentTimeline: IntentSnapshot[];
  contextSummary: string;
  extractedEntities: ExtractedEntity[];
}
