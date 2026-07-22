import { Prisma } from '@prisma/client';
import * as agentRepository from '../repositories/agentRepository.js';
import * as sessionRepository from '../repositories/sessionRepository.js';
import * as callLogService from './callLogService.js';
import { llmProviderGateway } from '../../lib/voice-runtime/providers/LLMGateway.js';
import { logger } from '../lib/logger.js';

const DEFAULT_GREETING = 'Olá! Aqui é a assistente virtual do Birth Voices Hub. Como posso ajudar você hoje?';
const DEFAULT_SYSTEM_PROMPT =
  'Você é uma assistente de voz do Birth Voices Hub, especializada em atendimento e qualificação de contatos. ' +
  'Seja acolhedora, clara e objetiva nas respostas, adequadas para serem faladas em voz alta.';
const REPROMPT_MESSAGE = 'Desculpe, não consegui ouvir. Pode repetir, por favor?';
const GOODBYE_MESSAGE = 'Não foi possível captar sua resposta. Vamos encerrar por aqui, tente novamente em instantes.';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface PhoneSessionMetadata {
  callSid: string;
  from: string;
  to: string;
  turns: ConversationTurn[];
}

function configString(configuration: unknown, key: string, fallback: string): string {
  if (configuration && typeof configuration === 'object' && key in configuration) {
    const value = (configuration as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

export async function resolveAgent(toNumber: string) {
  const byNumber = await agentRepository.findAgentByPhoneNumber(toNumber);
  if (byNumber) return byNumber;

  const defaultAgentId = process.env.DEFAULT_AGENT_ID;
  if (defaultAgentId) {
    const fallbackAgent = await agentRepository.findAgentById(defaultAgentId);
    if (fallbackAgent) return fallbackAgent;
  }

  return null;
}

export async function startCall(params: { callSid: string; from: string; to: string }) {
  const agent = await resolveAgent(params.to);
  if (!agent) {
    logger.warn('Incoming call to unconfigured number', { to: params.to, callSid: params.callSid });
    return { configured: false as const };
  }

  const metadata: PhoneSessionMetadata = { callSid: params.callSid, from: params.from, to: params.to, turns: [] };
  const session = await sessionRepository.createPhoneSession(agent.tenantId, agent.id, metadata);

  return {
    configured: true as const,
    sessionId: session.id,
    greeting: configString(agent.configuration, 'greeting', DEFAULT_GREETING),
  };
}

export async function handleTurn(params: { sessionId: string; speechResult: string }) {
  const session = await sessionRepository.findSessionById(params.sessionId);
  if (!session || !session.agentId) return { found: false as const };

  const agent = await agentRepository.findAgentById(session.agentId);
  if (!agent) return { found: false as const };

  const metadata = (session.metadata as unknown as PhoneSessionMetadata) || { turns: [] };
  metadata.turns = metadata.turns || [];
  metadata.turns.push({ role: 'user', content: params.speechResult, timestamp: Date.now() });

  const systemInstruction = configString(agent.configuration, 'systemPrompt', DEFAULT_SYSTEM_PROMPT);
  const gatewayResponse = await llmProviderGateway.processRequest(params.speechResult, 'GoogleGemini', systemInstruction);

  metadata.turns.push({ role: 'assistant', content: gatewayResponse.text, timestamp: Date.now() });

  await sessionRepository.updateSession(session.id, { metadata: metadata as unknown as Prisma.InputJsonValue });

  return { found: true as const, reply: gatewayResponse.text };
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, Math.floor(totalSeconds % 60));
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const TWILIO_STATUS_TO_CALL_LOG: Record<string, string> = {
  completed: 'Concluído',
  busy: 'Ocupado',
  'no-answer': 'Não atendida',
  failed: 'Falha',
  canceled: 'Cancelada',
};

export async function endCall(params: { callSid: string; status: string; durationSeconds: number }) {
  const session = await sessionRepository.findActivePhoneSessionByCallSid(params.callSid);
  if (!session) return { found: false as const };

  await sessionRepository.updateSession(session.id, { status: params.status === 'completed' ? 'completed' : 'failed' });

  const agent = session.agentId ? await agentRepository.findAgentById(session.agentId) : null;
  await callLogService.createCallLog(session.tenantId, null, {
    patientName: 'Ligação Telefônica',
    duration: formatDuration(params.durationSeconds),
    status: TWILIO_STATUS_TO_CALL_LOG[params.status] || params.status,
    agent: agent?.name || 'Agente não identificado',
  });

  return { found: true as const };
}

export const messages = {
  reprompt: REPROMPT_MESSAGE,
  goodbye: GOODBYE_MESSAGE,
};
