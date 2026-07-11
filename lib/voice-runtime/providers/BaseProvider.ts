import { AudioChunk } from '../types';

export interface ProviderResponse {
  text?: string;
  audio?: AudioChunk;
  error?: any;
  latencyMs: number;
}

export abstract class BaseProvider {
  public abstract id: string;
  public abstract name: string;
  public abstract type: 'STT' | 'LLM' | 'TTS' | 'E2E';
  
  public abstract initialize(config: any): Promise<void>;
  public abstract process(input: any, context?: any): Promise<ProviderResponse>;
  public abstract checkHealth(): Promise<boolean>;
  public abstract destroy(): Promise<void>;
}
