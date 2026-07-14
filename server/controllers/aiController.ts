import { Response, Request } from 'express'; import { otelCollector } from '../../lib/voice-runtime/otel.js'; import { llmProviderGateway } from '../../lib/voice-runtime/providers/LLMGateway.js'; import { chatSchema, ttsSchema } from '../validators/ai.js';
export const aiController = {
  observability: (req: Request, res: Response) => res.json({ spans: otelCollector.getSpans(), metrics: otelCollector.getMetrics() }),
  chat: async (req: Request, res: Response) => {
    try { const p = chatSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message }); const r = await llmProviderGateway.processRequest(p.data.currentMessages[p.data.currentMessages.length - 1].text, (p.data.provider as any) || 'GoogleGemini', p.data.prompt || ''); res.json({ text: r.text, providerUsed: r.providerUsed, latencyMs: r.latencyMs, tokensUsed: r.tokensUsed, costUSD: r.costUSD, fromFallback: r.fromFallback }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  },
  tts: async (req: Request, res: Response) => res.json({ audio: "" })
};
