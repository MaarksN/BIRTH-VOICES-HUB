export type Question = {
  id: string;
  text: string;
  type: 'open' | 'closed';
  collectAs?: string;
  required?: boolean;
  riskKeywords?: string[];
  stopOnRisk?: boolean;
};

export type AgentTemplate = 'maternal' | 'hr' | 'sales' | 'onboarding' | 'support' | 'research';

export type AgentConfig = {
  name: string;
  template: AgentTemplate;
  description: string;
  language: string;
  tone: string[];
  speed: number;
  systemInstruction: string;
  analysisPrompt: string;
  questions: Question[];
};

export type TranscriptItem = {
  role: 'agent' | 'user';
  text: string;
};

export type StructuredRisk = {
  questionId?: string;
  question: string;
  keyword: string;
  answer: string;
  detectedAt: string;
};

export type StructuredDraft = {
  extracted: Array<{ label: string; value: string }>;
  triggeredRisks: StructuredRisk[];
  requiredMissing?: string[];
};

export type OrganizationRole = 'owner' | 'admin' | 'operator' | 'viewer' | 'suspended';

export type PrivacyConsent = {
  acceptedAt: string;
  version: string;
  source: string;
};

export interface User {
  id?: string;
  name: string;
  company: string;
  role?: OrganizationRole | string;
  email?: string;
  brandColor?: string;
  organizationId?: string;
  privacyConsent?: PrivacyConsent;
}

export type Sentiment = 'Positivo' | 'Neutro' | 'Negativo';

export type RiskLevel = 'Baixo' | 'Moderado' | 'Alto';

export type StoredAgent = AgentConfig & {
  id: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredSession = SessionRecord & {
  ownerId: string;
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  agentName: string;
  caller: string;
  dateTime: string;
  duration: string;
  sentiment: Sentiment;
  riskLevel: RiskLevel;
  score: number;
  summary: string;
  transcript: string;
  tags: string[];
  followUp: string;
  extracted: Array<{ label: string; value: string }>;
  structuredDraft?: StructuredDraft;
  integrationDelivery?: IntegrationDelivery;
  audioUrl?: string;
};

export type TelephonyCallStatus = 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed';

export type TelephonyCall = {
  id: string;
  agentId: string;
  agentName: string;
  caller: string;
  to: string;
  from: string;
  provider: 'twilio';
  providerCallSid?: string;
  status: TelephonyCallStatus;
  currentQuestionIndex: number;
  transcriptItems: TranscriptItem[];
  structuredDraft: StructuredDraft;
  sessionId?: string;
  error?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type RuntimeStatus = {
  geminiConfigured: boolean;
  storage: string;
  telephonyConfigured: boolean;
  telephonyOutboundConfigured: boolean;
  publicBaseUrlConfigured: boolean;
  integrationConfigured: boolean;
};

export type AuditLogEntry = {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  createdAt: string;
  requestId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  previousHash?: string;
  hash: string;
};

export type IntegrationDelivery = {
  id?: string;
  status: 'not_configured' | 'delivered' | 'failed';
  event?: string;
  sessionId?: string;
  attempt?: number;
  target?: string;
  statusCode?: number;
  message?: string;
  deliveredAt?: string;
  responseBody?: string;
};

export type WebhookIntegration = {
  enabled: boolean;
  url: string;
  hasSecret: boolean;
  updatedAt?: string;
  lastDelivery?: IntegrationDelivery;
};

export type IntegrationSettings = {
  webhook: WebhookIntegration;
};
