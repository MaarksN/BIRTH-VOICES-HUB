import { BaseProvider, ProviderResponse, ProviderInput, ProviderContext } from './BaseProvider';
import { logger } from '../../../src/lib/logger.js';

export class AnthropicProvider extends BaseProvider {
  public id = 'Anthropic';
  public name = 'Anthropic Claude API';
  public type = 'LLM' as const;

  public async initialize(_config: Record<string, unknown>): Promise<void> {
    logger.debug(`[${this.name}] Initialized`);
  }

  public async process(input: ProviderInput, context?: ProviderContext): Promise<ProviderResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { text: 'Chave da Anthropic não configurada.', latencyMs: 0 };
    }

    const start = Date.now();
    const systemMessage = context ? JSON.stringify(context) : "Você é um assistente de voz.";

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          system: systemMessage,
          messages: [
            { role: 'user', content: String(input) }
          ],
          max_tokens: 1024
        })
      });

      if (!res.ok) {
        throw new Error(`Anthropic API Error: ${res.statusText}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || 'Sem resposta.';

      return {
        text,
        latencyMs: Date.now() - start
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[${this.name}] Error processing LLM request`, err);
      return { text: `Erro: ${msg}`, latencyMs: Date.now() - start };
    }
  }

  public async checkHealth(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  public async destroy(): Promise<void> {
    logger.debug(`[${this.name}] Destroyed`);
  }
}

export const anthropicProvider = new AnthropicProvider();
