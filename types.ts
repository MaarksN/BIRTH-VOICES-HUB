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

export interface User {
  id?: string;
  name: string;
  company: string;
  role?: string;
  email?: string;
  brandColor?: string;
}

export type Sentiment = 'Positivo' | 'Neutro' | 'Negativo';

export type RiskLevel = 'Baixo' | 'Moderado' | 'Alto';

export type StoredAgent = AgentConfig & {
  id: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
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

export type RuntimeStatus = {
  geminiConfigured: boolean;
  storage: string;
  telephonyConfigured: boolean;
  integrationConfigured: boolean;
};

export type IntegrationDelivery = {
  status: 'not_configured' | 'delivered' | 'failed';
  target?: string;
  statusCode?: number;
  message?: string;
  deliveredAt?: string;
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
