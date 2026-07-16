import { Request, Response } from 'express';
import twilio from 'twilio';
import * as telephonyService from '../services/telephonyService.js';
import { logger } from '../lib/logger.js';

const { VoiceResponse } = twilio.twiml;

function sendTwiml(res: Response, twiml: InstanceType<typeof VoiceResponse>) {
  res.type('text/xml').send(twiml.toString());
}

function gatherActionUrl(sessionId: string): string {
  return `/api/telephony/twilio/gather?sessionId=${encodeURIComponent(sessionId)}`;
}

export async function incomingCallHandler(req: Request, res: Response) {
  const callSid = String(req.body.CallSid || '');
  const from = String(req.body.From || '');
  const to = String(req.body.To || '');

  const twiml = new VoiceResponse();
  const result = await telephonyService.startCall({ callSid, from, to });

  if (!result.configured) {
    twiml.say({ language: 'pt-BR' }, 'Este número ainda não está configurado para atendimento. Por favor, tente novamente mais tarde.');
    twiml.hangup();
    return sendTwiml(res, twiml);
  }

  const gather = twiml.gather({
    input: ['speech'],
    action: gatherActionUrl(result.sessionId),
    method: 'POST',
    language: 'pt-BR',
    speechTimeout: 'auto',
  });
  gather.say({ language: 'pt-BR' }, result.greeting);

  // Reached if the caller never speaks and Twilio falls through the <Gather> without redirecting.
  twiml.say({ language: 'pt-BR' }, telephonyService.messages.goodbye);
  sendTwiml(res, twiml);
}

export async function gatherHandler(req: Request, res: Response) {
  const sessionId = String(req.query.sessionId || '');
  const speechResult = String(req.body.SpeechResult || '').trim();
  const twiml = new VoiceResponse();

  if (!sessionId) {
    twiml.say({ language: 'pt-BR' }, telephonyService.messages.goodbye);
    twiml.hangup();
    return sendTwiml(res, twiml);
  }

  if (!speechResult) {
    const gather = twiml.gather({
      input: ['speech'],
      action: gatherActionUrl(sessionId),
      method: 'POST',
      language: 'pt-BR',
      speechTimeout: 'auto',
    });
    gather.say({ language: 'pt-BR' }, telephonyService.messages.reprompt);
    twiml.say({ language: 'pt-BR' }, telephonyService.messages.goodbye);
    return sendTwiml(res, twiml);
  }

  const result = await telephonyService.handleTurn({ sessionId, speechResult });
  if (!result.found) {
    twiml.say({ language: 'pt-BR' }, telephonyService.messages.goodbye);
    twiml.hangup();
    return sendTwiml(res, twiml);
  }

  const gather = twiml.gather({
    input: ['speech'],
    action: gatherActionUrl(sessionId),
    method: 'POST',
    language: 'pt-BR',
    speechTimeout: 'auto',
  });
  gather.say({ language: 'pt-BR' }, result.reply);
  sendTwiml(res, twiml);
}

export async function statusCallbackHandler(req: Request, res: Response) {
  const callSid = String(req.body.CallSid || '');
  const status = String(req.body.CallStatus || '');
  const durationSeconds = Number(req.body.CallDuration || 0);

  try {
    if (callSid && status) {
      await telephonyService.endCall({ callSid, status, durationSeconds });
    }
  } catch (err) {
    logger.error('Failed to finalize call from status callback', err);
  }

  res.status(200).send();
}
