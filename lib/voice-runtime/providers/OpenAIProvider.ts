import { BaseProvider, ProviderResponse } from './BaseProvider';
import { logger } from '../../../src/lib/logger.js';

export class OpenAIRealtimeProvider extends BaseProvider {
  public id = 'OpenAI';
  public name = 'OpenAI Realtime API';
  public type = 'E2E' as const;
  
  public async initialize(_config: Record<string, unknown>): Promise<void> {
    logger.debug(`[${this.name}] Initialized`);
  }

   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async process(input: any, context?: any): Promise<ProviderResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { text: 'Chave da OpenAI não configurada.', latencyMs: 0 };
    }

    const start = Date.now();
    const systemMessage = context ? JSON.stringify(context) : "Você é um assistente de voz.";

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: input }
          ],
          temperature: 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API Error: ${res.statusText}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || 'Sem resposta.';

      return {
        text,
        latencyMs: Date.now() - start
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { text: `Erro: ${msg}`, latencyMs: Date.now() - start };
    }
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  public async destroy(): Promise<void> {
    logger.debug(`[${this.name}] Destroyed`);
  }
}

export const openaiProvider = new OpenAIRealtimeProvider();
