export type Question = {
  id: string;
  text: string;
  type: 'open' | 'closed';
};

export type AgentTemplate = 'hr' | 'sales' | 'onboarding' | 'support' | 'research';

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

export interface User {
  name: string;
  company: string;
  role?: string;
  email?: string;
}
