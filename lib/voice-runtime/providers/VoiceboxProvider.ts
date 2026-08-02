import { BaseProvider, ProviderResponse, ProviderInput, ProviderContext } from './BaseProvider';
import { logger } from '../../../src/lib/logger.js';

export class VoiceboxProvider extends BaseProvider {
  public id = 'Voicebox';
  public name = 'Voicebox Local TTS';
  public type = 'TTS' as const;
  private apiUrl: string;
  private isAvailable: boolean = false;

  constructor() {
    super();
    this.apiUrl = process.env.VOICEBOX_API_URL || 'http://127.0.0.1:17493';
  }

  public async initialize(_config: Record<string, unknown>): Promise<void> {
    try {
      this.isAvailable = true;
      logger.debug(`[${this.name}] Initialized pointing to ${this.apiUrl}`);
    } catch (err) {
      logger.warn(`[${this.name}] Failed to initialize`, err);
    }
  }

  public async process(input: ProviderInput, context?: ProviderContext): Promise<ProviderResponse> {
    const start = Date.now();
    // No caller currently threads a voice selection through `context`; keep
    // the previous default while allowing a future `{ voiceId }` context.
    const voiceId = typeof context?.voiceId === 'string' ? context.voiceId : 'default';

    try {
      const response = await fetch(`${this.apiUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, voice: voiceId })
      });

      if (!response.ok) {
        throw new Error(`Voicebox API error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      return {
        audio: {
          data: buffer,
          timestamp: Date.now(),
          isSpeech: true
        },
        latencyMs: Date.now() - start
      };
    } catch (err: unknown) {
      logger.error(`[${this.name}] Error processing TTS`, err);
      return {
        audio: {
          data: new Uint8Array(0),
          timestamp: Date.now(),
          isSpeech: false
        },
        latencyMs: Date.now() - start,
        error: err
      };
    }
  }

  public async checkHealth(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      const res = await fetch(`${this.apiUrl}/docs`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async destroy(): Promise<void> {
    logger.debug(`[${this.name}] Destroyed`);
  }
}

export const voiceboxProvider = new VoiceboxProvider();
