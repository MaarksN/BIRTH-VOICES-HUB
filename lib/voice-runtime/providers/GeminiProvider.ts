import { BaseProvider, ProviderResponse } from './BaseProvider';

export class GeminiLiveProvider extends BaseProvider {
  public id = 'GoogleGemini';
  public name = 'Google Gemini 2.5 Pro Live';
  public type = 'E2E' as const;
  
  public async initialize(config: any): Promise<void> {
    console.debug(`[${this.name}] Initialized`);
  }

  public async process(input: any, context?: any): Promise<ProviderResponse> {
    return {
      text: 'Compreendo seus sintomas. Vou registrar e avisar o médico.',
      latencyMs: 320
    };
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  public async destroy(): Promise<void> {
    console.debug(`[${this.name}] Destroyed`);
  }
}

export const geminiProvider = new GeminiLiveProvider();
