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
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: any[];
}

export interface RuntimeEvent {
  id: string;
  timestamp: number;
  type: string;
  payload: any;
  latency?: number;
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
