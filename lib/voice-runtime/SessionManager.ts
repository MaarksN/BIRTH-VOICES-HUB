import { VoiceSession, SessionState, AgentRuntimeConfig, ConversationTurn } from './types';
import { observability } from './Observability';
import { latencyMonitor } from './LatencyMonitor';
import { memoryPipeline } from './MemoryPipeline';
import { streamingEngine } from './StreamingEngine';
import { audioPipeline } from './AudioPipeline';
import { failoverEngine } from './FailoverEngine';
import { webhookService } from '../../src/services/webhook.service.js';

export class SessionManager {
  private sessions: Map<string, VoiceSession> = new Map();

  public createSession(agentId: string, callerId: string, config: AgentRuntimeConfig): VoiceSession {
    const sessionId = `sess_${crypto.randomUUID()}`;
    
    const session: VoiceSession = {
      sessionId,
      agentId,
      workspaceId: 'ws_default',
      organizationId: 'org_default',
      projectId: 'proj_default',
      callerId,
      channel: 'web',
      provider: config.providerLlm,
      status: 'Idle',
      durationMs: 0,
      latencyMs: 0,
      model: config.model,
      language: 'pt-BR',
      region: 'sa-east-1',
      history: [],
      events: []
    };

    this.sessions.set(sessionId, session);
    
    // Initialize pipelines
    latencyMonitor.initialize(sessionId);
    memoryPipeline.initialize(sessionId);
    streamingEngine.createSessionStreams(sessionId, undefined);

    observability.logEvent(sessionId, 'SESSION_CREATED', { agentId, callerId });
    
    return session;
  }

  public updateState(sessionId: string, state: SessionState) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = state;
    observability.logEvent(sessionId, 'STATE_CHANGED', { state });
  }

  public async startSession(sessionId: string) {
    this.updateState(sessionId, 'Connecting');
    // Connect to external VoIP or WebRTC signaling
    this.updateState(sessionId, 'Listening');
  }

  public async processUserAudio(sessionId: string, rawAudio: ArrayBuffer) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const chunk = audioPipeline.processInputChunk(sessionId, rawAudio);
    streamingEngine.writeInput(sessionId, chunk);
  }

  public async handleUserText(sessionId: string, text: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.updateState(sessionId, 'Thinking');

    const turn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    
    memoryPipeline.addTurn(sessionId, turn);

    // Context & RAG would happen here
    const context = memoryPipeline.getContext(sessionId);

    try {
      observability.startSpan(`llm-${sessionId}`);
      
      const response = await failoverEngine.executeWithFailover(
        sessionId,
        'GenerateResponse',
        session.provider,
        'LLM',
        ['OpenAI', 'Anthropic'], // Fallbacks
        async (provider) => {
          return await provider.process(text, context);
        }
      );

      const latency = observability.endSpan(`llm-${sessionId}`, sessionId, 'LLM_COMPLETED');
      if (latency) latencyMonitor.recordMetric(sessionId, 'llmMs', latency);

      // Handle Tools if LLM returned tool calls
      if (response.text) {
        this.updateState(sessionId, 'Speaking');

        const responseText = response.text;

        const assistantTurn: ConversationTurn = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now()
        };

        memoryPipeline.addTurn(sessionId, assistantTurn);

        // TTS processing
        observability.startSpan(`tts-${sessionId}`);
        const ttsResponse = await failoverEngine.executeWithFailover(
          sessionId,
          'TextToSpeech',
          'Voicebox',
          'TTS',
          ['ElevenLabs', 'Deepgram'],
          async (provider) => {
            return await provider.process(responseText);
          }
        );
        const ttsLatency = observability.endSpan(`tts-${sessionId}`, sessionId, 'TTS_COMPLETED');
        if (ttsLatency) latencyMonitor.recordMetric(sessionId, 'ttsMs', ttsLatency);

        if (ttsResponse.audio) {
          streamingEngine.writeOutput(sessionId, ttsResponse.audio);
        }
      }

      this.updateState(sessionId, 'Listening');

    } catch (error: unknown) {
      this.updateState(sessionId, 'Error');
      const message = error instanceof Error ? error.message : String(error);
      observability.logEvent(sessionId, 'SESSION_ERROR', { error: message });
    }
  }

  public endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    this.updateState(sessionId, 'Finished');
    streamingEngine.cleanup(sessionId);

    observability.logEvent(sessionId, 'SESSION_ENDED');

    if (session) {
      webhookService.dispatch(session.organizationId, 'call.completed', { 
        sessionId, 
        durationMs: session.durationMs,
        agentId: session.agentId,
        history: session.history
      }).catch((err) => {
        observability.logEvent(sessionId, 'WEBHOOK_DISPATCH_ERROR', { error: String(err) });
      });
    }
  }

  public getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }
}

export const sessionManager = new SessionManager();
