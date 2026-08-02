import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from '@livekit/agents';
import * as silero from '@livekit/agents-plugin-silero';
import * as openai from '@livekit/agents-plugin-openai';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Proof-of-concept agent for the 3CX -> SIP -> LiveKit path.
 *
 * The goal of this file is NOT to be the SDR. It is to answer one question that no amount of
 * design work can answer: does audio survive the trip from a real phone, through 3CX, over the
 * SIP trunk, into a LiveKit room, and back — and how many milliseconds does that cost?
 *
 * So the instructions below are deliberately trivial. Do not grow this into the real agent until
 * the latency numbers say the path is viable. The real conversation logic already exists in the
 * main app (LLMGateway, RAG, guardrails) and should be wired in only after that.
 */
export default defineAgent({
  // Loading VAD weights takes seconds; doing it per call would show up as dead air on pickup.
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext) => {
    const answeredAt = Date.now();

    const agent = new voice.Agent({
      instructions:
        'Você é um teste de conectividade. Cumprimente em português do Brasil, diga que a ' +
        'ligação chegou pelo 3CX, e peça para a pessoa dizer uma frase qualquer. Repita de volta ' +
        'o que ela disser. Seja muito breve.',
    });

    const session = new voice.AgentSession({
      // Every component here is a decision to revisit after the PoC — this combination is chosen
      // only because the main app already holds keys for OpenAI and ElevenLabs, so the PoC adds
      // no new vendor. Deepgram STT is the usual latency win if this proves too slow.
      stt: new openai.STT(),
      llm: new openai.LLM({ model: 'gpt-4.1-mini' }),
      tts: new elevenlabs.TTS(),
      vad: ctx.proc.userData.vad as silero.VAD,
    });

    await session.start({ agent, room: ctx.room });

    // The number that decides whether this architecture is usable for cold calling. Anything past
    // ~1.5s of silence after pickup reads as a dropped call to the person who answered.
    await session.generateReply({ instructions: 'Cumprimente e peça uma frase de teste.' });
    console.log(
      JSON.stringify({
        event: 'poc.first_audio',
        room: ctx.room.name,
        msFromEntryToFirstReply: Date.now() - answeredAt,
      }),
    );
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
