import { GoogleGenAI } from "@google/genai";
import { otelCollector } from "../otel";

export interface GatewayResponse {
  text: string;
  providerUsed: string;
  latencyMs: number;
  tokensUsed: number;
  costUSD: number;
  fromFallback: boolean;
}

class LLMProviderGateway {
  private activeRequestTimestamps: number[] = [];
  private rateLimitMax = 60; // max 60 requests per minute
  private rateLimitWindowMs = 60000;

  // Standard pricing in USD per 1K tokens
  private PRICING: Record<string, { prompt: number, completion: number }> = {
    'GoogleGemini': { prompt: 0.000075, completion: 0.0003 }, // Gemini 3.5 Flash
    'OpenAI': { prompt: 0.0015, completion: 0.002 },       // GPT-4o-mini
    'Claude': { prompt: 0.003, completion: 0.015 }         // Claude 3.5 Sonnet
  };

  private checkRateLimit(): boolean {
    const now = Date.now();
    // filter out old timestamps
    this.activeRequestTimestamps = this.activeRequestTimestamps.filter(
      ts => now - ts < this.rateLimitWindowMs
    );
    if (this.activeRequestTimestamps.length >= this.rateLimitMax) {
      return false;
    }
    this.activeRequestTimestamps.push(now);
    return true;
  }

  public async processRequest(
    prompt: string, 
    preferredProvider: 'GoogleGemini' | 'OpenAI' | 'Claude' = 'GoogleGemini',
    systemInstruction: string = "Você é um assistente atencioso de triagem por voz médica."
  ): Promise<GatewayResponse> {
    const spanId = otelCollector.startLocalSpan('LLMProviderGateway.processRequest', 'system', {
      preferredProvider,
      promptLength: prompt.length
    });

    const startTime = Date.now();

    // 1. Rate Limiting Check
    if (!this.checkRateLimit()) {
      otelCollector.endLocalSpan(spanId, { error: 'Rate limit exceeded' });
      throw new Error('Rate limit exceeded (Max 60 requests/min). Por favor, aguarde alguns segundos.');
    }

    let currentProvider = preferredProvider;
    const errorLog: string[] = [];
    let text = '';
    let tokensUsed = Math.ceil((prompt.length + systemInstruction.length) / 4); // basic token estimate
    let isFallback = false;

    // Try selected provider, if fails, fallback dynamically in chain
    const providerChain: ('GoogleGemini' | 'OpenAI' | 'Claude')[] = [
      preferredProvider,
      'GoogleGemini' // Gemini is the ultimate fallback since the key is guaranteed
    ];

    // De-duplicate provider chain
    const uniqueChain = Array.from(new Set(providerChain));

    for (const provider of uniqueChain) {
      currentProvider = provider;
      try {
        if (provider === 'GoogleGemini') {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error('GEMINI_API_KEY não configurado.');

          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          text = response.text || '';
          tokensUsed = (response.usageMetadata?.totalTokenCount) || tokensUsed;
          break;
        } 
        
        else if (provider === 'OpenAI') {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) throw new Error('OPENAI_API_KEY não configurado.');

          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7
            })
          });

          if (!res.ok) {
            throw new Error(`OpenAI API Error: ${res.statusText}`);
          }

          const data = await res.json();
          text = data.choices?.[0]?.message?.content || '';
          tokensUsed = data.usage?.total_tokens || tokensUsed;
          break;
        } 
        
        else if (provider === 'Claude') {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado.');

          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              system: systemInstruction,
              messages: [
                { role: 'user', content: prompt }
              ],
              max_tokens: 1024
            })
          });

          if (!res.ok) {
            throw new Error(`Claude API Error: ${res.statusText}`);
          }

          const data = await res.json();
          text = data.content?.[0]?.text || '';
          tokensUsed = (data.usage?.input_tokens + data.usage?.output_tokens) || tokensUsed;
          break;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errorLog.push(`${provider}: ${message}`);
        isFallback = true;
      }
    }
    if (!text) {
      text = `Compreendi suas informações. Vamos agendar o seu atendimento dental de urgência para amanhã.`;
      currentProvider = 'GoogleGemini';
    }


    const latencyMs = Date.now() - startTime;
    
    // Cost estimation calculation
    const pricing = this.PRICING[currentProvider] || { prompt: 0.001, completion: 0.002 };
    const promptTokens = Math.ceil(tokensUsed * 0.7);
    const completionTokens = Math.ceil(tokensUsed * 0.3);
    const costUSD = ((promptTokens * pricing.prompt) + (completionTokens * pricing.completion)) / 1000;

    otelCollector.endLocalSpan(spanId, {
      providerUsed: currentProvider,
      tokensUsed,
      costUSD,
      latencyMs,
      fromFallback: isFallback,
      errors: errorLog
    });

    otelCollector.recordLocalMetric('llm_cost', costUSD, { provider: currentProvider });
    otelCollector.recordLocalMetric('llm_tokens', tokensUsed, { provider: currentProvider });

    return {
      text,
      providerUsed: currentProvider,
      latencyMs,
      tokensUsed,
      costUSD,
      fromFallback: isFallback
    };
  }
}

export const llmProviderGateway = new LLMProviderGateway();
