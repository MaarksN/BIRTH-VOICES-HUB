import { BaseProvider, ProviderResponse } from './BaseProvider';
import { logger } from '../../../src/lib/logger.js';

export class GeminiLiveProvider extends BaseProvider {
  public id = 'GoogleGemini';
  public name = 'Google Gemini 2.0 Flash Realtime';
  public type = 'E2E' as const;
  private ws?: WebSocket;
  
  public async initialize(_config: Record<string, unknown>): Promise<void> {
    logger.debug(`[${this.name}] Initialized`);
  }

  public async process(input: any, context?: any): Promise<ProviderResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { text: 'Chave do Gemini não configurada.', latencyMs: 0 };
    }

    const start = Date.now();
    // In a real WebRTC/Live API, we would use the new gemini-2.5-flash or gemini-2.0-flash with the Live API over WebSocket.
    // For this implementation, since @google/genai doesn't natively expose the BIDI websocket yet in a simple way for Node,
    // we use the REST fallback for textual response, but correctly using gemini-2.5-flash as the model.
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey,
        });

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: input,
          config: {
            systemInstruction: context ? JSON.stringify(context) : "Você é um assistente de voz.",
            temperature: 0.7,
          },
        });

        return {
          text: response.text || 'Desculpe, não consegui gerar uma resposta.',
          latencyMs: Date.now() - start
        };
    } catch(err: any) {
        return {
          text: `Erro: ${err.message}`,
          latencyMs: Date.now() - start
        };
    }
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  public async destroy(): Promise<void> {
    if (this.ws) {
        this.ws.close();
    }
    logger.debug(`[${this.name}] Destroyed`);
  }
}

export const geminiProvider = new GeminiLiveProvider();
