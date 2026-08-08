import { Prisma } from '@prisma/client';
import * as agentRepository from '../repositories/agentRepository.js';
import * as sessionRepository from '../repositories/sessionRepository.js';
import * as callLogService from './callLogService.js';
import { webhookService } from './webhook.service.js';
import { llmProviderGateway } from '../../lib/voice-runtime/providers/LLMGateway.js';
import { logger } from '../lib/logger.js';

const DEFAULT_GREETING = 'Olá! Aqui é a assistente virtual do Birth Voices Hub. Como posso ajudar você hoje?';
const DEFAULT_OUTBOUND_GREETING =
  'Olá! Aqui é a assistente virtual do Birth Voices Hub. Você tem um minuto para conversarmos?';
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

export interface PhoneSessionMetadata {
  /** Null between creating an outbound session and the provider accepting the call. */
  callSid: string | null;
  /** Null on an outbound session until the provider reports the caller ID it used. */
  from: string | null;
  to: string;
  turns: ConversationTurn[];
  /** Absent on sessions created before outbound calling existed; treated as inbound. */
  direction?: 'inbound' | 'outbound';
  /** Caller-supplied facts about the person being dialed; feeds the greeting template. */
  context?: Record<string, unknown>;
  /** Per-call webhook destination for `agent.call.ended`. */
  callbackUrl?: string | null;
}

function configString(configuration: unknown, key: string, fallback: string): string {
  if (configuration && typeof configuration === 'object' && key in configuration) {
    const value = (configuration as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

/**
 * Fills `{{placeholders}}` in a greeting from the call context, so an outbound agent can open with
 * "Olá João, da Transportadora X" instead of a generic line. An unknown placeholder collapses to
 * nothing rather than being read aloud as literal `{{nome}}`.
 */
export function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      const value = context[key];
      return value == null ? '' : String(value);
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
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

  const metadata: PhoneSessionMetadata = {
    direction: 'inbound',
    callSid: params.callSid,
    from: params.from,
    to: params.to,
    turns: [],
  };
  const session = await sessionRepository.createPhoneSession(agent.tenantId, agent.id, metadata);

  return {
    configured: true as const,
    sessionId: session.id,
    greeting: configString(agent.configuration, 'greeting', DEFAULT_GREETING),
  };
}

/**
 * Opens the conversation on a call *we* placed. The session already exists (outboundCallService
 * created it before asking Twilio to dial), so this only resolves what the agent should say first.
 *
 * The greeting is appended to the transcript here because, unlike inbound, an outbound call's
 * transcript is shipped to the originating CRM — a transcript that started at the prospect's first
 * words would read as though the agent never introduced itself.
 */
export async function startOutboundCall(params: { sessionId: string; callSid: string }) {
  const session = await sessionRepository.findSessionById(params.sessionId);
  if (!session || !session.agentId) return { found: false as const };

  const agent = await agentRepository.findAgentById(session.agentId);
  if (!agent) return { found: false as const };

  const metadata = (session.metadata as unknown as PhoneSessionMetadata) || ({ turns: [] } as unknown as PhoneSessionMetadata);
  metadata.turns = metadata.turns || [];

  const greeting = renderTemplate(
    configString(agent.configuration, 'outboundGreeting', DEFAULT_OUTBOUND_GREETING),
    metadata.context ?? {},
  );

  metadata.turns.push({ role: 'assistant', content: greeting, timestamp: Date.now() });
  if (params.callSid) metadata.callSid = params.callSid;

  await sessionRepository.updateSession(session.id, { metadata: metadata as unknown as Prisma.InputJsonValue });

  return { found: true as const, greeting };
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
  const metadata = (session.metadata as unknown as PhoneSessionMetadata) || ({ turns: [] } as unknown as PhoneSessionMetadata);
  const outcome = TWILIO_STATUS_TO_CALL_LOG[params.status] || params.status;
  const isOutbound = metadata.direction === 'outbound';

  await callLogService.createCallLog(session.tenantId, null, {
    // Outbound calls know who they dialed; inbound ones keep the generic label they always had.
    contactName: isOutbound ? String(metadata.context?.name ?? metadata.to ?? 'Ligação Telefônica') : 'Ligação Telefônica',
    duration: formatDuration(params.durationSeconds),
    status: outcome,
    agent: agent?.name || 'Agente não identificado',
  });

  // The originating system (e.g. a CRM that asked for this call) learns the result only here —
  // dispatch swallows its own errors, so a webhook problem can never fail the call teardown.
  await webhookService.dispatch(
    session.tenantId,
    'agent.call.ended',
    {
      sessionId: session.id,
      callSid: params.callSid,
      direction: metadata.direction ?? 'inbound',
      from: metadata.from ?? null,
      to: metadata.to ?? null,
      status: params.status,
      outcome,
      durationSeconds: params.durationSeconds,
      agentId: agent?.id ?? null,
      agentName: agent?.name ?? null,
      transcript: metadata.turns ?? [],
      context: metadata.context ?? {},
    },
    metadata.callbackUrl ?? undefined,
  );

  return { found: true as const };
}

export const messages = {
  reprompt: REPROMPT_MESSAGE,
  goodbye: GOODBYE_MESSAGE,
};
