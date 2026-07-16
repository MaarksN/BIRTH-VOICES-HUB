import { AudioChunk } from '../types';

export interface ProviderResponse {
  text?: string;
  audio?: AudioChunk;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream?: any;
  error?: unknown;
  latencyMs: number;
}

export abstract class BaseProvider {
  public abstract id: string;
  public abstract name: string;
  public abstract type: 'STT' | 'LLM' | 'TTS' | 'E2E';

  public abstract initialize(config: Record<string, unknown>): Promise<void>;
  // input/context vary by provider type (text, audio, memory context); no single concrete shape today, kept as `any`.
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract process(input: any, context?: any): Promise<ProviderResponse>;
  public abstract checkHealth(): Promise<boolean>;
  public abstract destroy(): Promise<void>;
}
