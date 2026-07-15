import { BaseProvider, ProviderResponse } from './BaseProvider';

export class OpenAIRealtimeProvider extends BaseProvider {
  public id = 'OpenAI';
  public name = 'OpenAI Realtime API';
  public type = 'E2E' as const;
  
  public async initialize(_config: Record<string, unknown>): Promise<void> {
    console.debug(`[${this.name}] Initialized`);
  }

  public async process(_input: any, _context?: any): Promise<ProviderResponse> {
    return {
      text: 'Por favor, aguarde enquanto verifico seus dados.',
      latencyMs: 400
    };
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  public async destroy(): Promise<void> {
    console.debug(`[${this.name}] Destroyed`);
  }
}

export const openaiProvider = new OpenAIRealtimeProvider();
