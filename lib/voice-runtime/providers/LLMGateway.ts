import { GoogleGenAI } from "@google/genai";
import { otelCollector, SYSTEM_TENANT_ID } from "../otel";
import { getAiConsent } from "../../../src/services/settingService.js";

export interface GatewayResponse {
  text: string;
  providerUsed: string;
  latencyMs: number;
  tokensUsed: number;
  costUSD: number;
  fromFallback: boolean;
  // True when the request never left the process because the tenant has not registered AI
  // consent (LGPD) — distinct from a provider outage. See processRequest for the enforcement.
  blockedByConsent?: boolean;
}

class LLMProviderGateway {
  // Per-tenant rate limit buckets. A single shared bucket (the previous implementation) let one
  // tenant's traffic exhaust the budget for every other tenant sharing this process — a
  // multi-tenant fairness bug in a platform whose own pitch is "alto volume" (AGENTS.md §1).
  private activeRequestTimestamps: Map<string, number[]> = new Map();
  private rateLimitMax = 60; // max 60 requests per minute, per tenant
  private rateLimitWindowMs = 60000;

  // Standard pricing in USD per 1K tokens
  private PRICING: Record<string, { prompt: number, completion: number }> = {
    'GoogleGemini': { prompt: 0.000075, completion: 0.0003 }, // Gemini 3.5 Flash
    'OpenAI': { prompt: 0.0015, completion: 0.002 },       // GPT-4o-mini
    'Claude': { prompt: 0.003, completion: 0.015 }         // Claude 3.5 Sonnet
  };

  private checkRateLimit(tenantId: string): boolean {
    const now = Date.now();
    const timestamps = (this.activeRequestTimestamps.get(tenantId) || [])
      .filter(ts => now - ts < this.rateLimitWindowMs);

    if (timestamps.length >= this.rateLimitMax) {
      this.activeRequestTimestamps.set(tenantId, timestamps);
      return false;
    }
    timestamps.push(now);
    this.activeRequestTimestamps.set(tenantId, timestamps);
    return true;
  }

  // Gate every external-AI-provider call on registered tenant consent (LGPD, AGENTS.md
  // bloqueador #8). `SYSTEM_TENANT_ID` calls (process bootstrap, and any caller that has not yet
  // been updated to propagate a real tenantId — see
  // .agents/handoffs/onda-1/04-para-05-llmgateway-tenantid-propagation.md) are not tied to any
  // real tenant's data, so there is no tenant consent to check; they pass through unchanged
  // rather than silently blocking 100% of a caller that simply hasn't been wired up yet. Every
  // REAL tenantId is checked and fails CLOSED when no consent record exists — "verificar
  // consentimento registrado" means exactly that: absence of a record is not consent.
  private async hasConsent(tenantId: string): Promise<boolean> {
    if (tenantId === SYSTEM_TENANT_ID) return true;
    const consent = await getAiConsent(tenantId);
    return consent.granted;
  }

  // `tenantId` defaults to SYSTEM_TENANT_ID so callers outside Agente 04's ownership that have
  // not yet been updated to pass a real tenant (see
  // .agents/handoffs/onda-1/04-para-05-llmgateway-tenantid-propagation.md) keep compiling and
  // keep tagging their spans/metrics as system-level instead of silently mixing them into a real
  // tenant's data — never omit the tag, never guess a tenant.
  public async processRequest(
    prompt: string,
    preferredProvider: 'GoogleGemini' | 'OpenAI' | 'Claude' = 'GoogleGemini',
    systemInstruction: string = "Você é um assistente atencioso de atendimento e qualificação por voz.",
    tenantId: string = SYSTEM_TENANT_ID
  ): Promise<GatewayResponse> {
    const spanId = otelCollector.startLocalSpan('LLMProviderGateway.processRequest', 'system', {
      preferredProvider,
      promptLength: prompt.length
    }, tenantId);

    const startTime = Date.now();

    // 1. Rate Limiting Check (per-tenant)
    if (!this.checkRateLimit(tenantId)) {
      otelCollector.endLocalSpan(spanId, { error: 'Rate limit exceeded' });
      throw new Error('Rate limit exceeded (Max 60 requests/min). Por favor, aguarde alguns segundos.');
    }

    // 2. AI consent check (LGPD) — must happen BEFORE any provider (including the "guaranteed"
    // Gemini fallback) ever sees the prompt. Consent gates sending personal/contact data to an
    // external AI provider at all, independent of which provider ends up serving the request.
    if (!(await this.hasConsent(tenantId))) {
      otelCollector.endLocalSpan(spanId, { blockedByConsent: true });
      otelCollector.recordLocalMetric('llm_consent_blocked', 1, { tenantId }, tenantId);
      return {
        text: 'Não posso processar esta solicitação com um provedor de IA externo até que o consentimento de uso de IA seja registrado para esta organização. Por favor, contate um administrador.',
        providerUsed: 'NONE',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        costUSD: 0,
        fromFallback: false,
        blockedByConsent: true
      };
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

        // Each individual degradation during a real call must be independently observable
        // (AGENTS.md bloqueador #6) — not just folded into the final span's `errors` array,
        // which only becomes visible after the whole request finishes. A discrete span per
        // failed provider shows up in the dashboard's timeline as it happens.
        const failSpan = otelCollector.startLocalSpan(
          'LLMProviderGateway.providerFailure',
          'llm-gateway',
          { provider, error: message, nextProvider: uniqueChain[uniqueChain.indexOf(provider) + 1] || 'NONE' },
          tenantId
        );
        otelCollector.endLocalSpan(failSpan, { failed: true });
      }
    }
    if (!text) {
      // Never fabricate a confirmation (for example, a scheduled service) when every provider
      // failed. An honest apology is safer than claiming an action that never happened.
      text = `Peço desculpas, estou com uma instabilidade técnica no momento. Por favor, tente novamente em alguns instantes.`;
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

    otelCollector.recordLocalMetric('llm_cost', costUSD, { provider: currentProvider }, tenantId);
    otelCollector.recordLocalMetric('llm_tokens', tokensUsed, { provider: currentProvider }, tenantId);

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
