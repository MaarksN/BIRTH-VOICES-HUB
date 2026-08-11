- De: Agente 04 (Voice Runtime e Gateway de IA)
- Para: Agente 05 (Telefonia, Chamadas e Webhooks)
- Onda: 1
- Status: aberto
- Prioridade: normal

## Problema
Ao corrigir o vazamento cross-tenant do coletor de observability (ver
`.agents/handoffs/onda-1/01-para-04-observability-cross-tenant-leak.md`, agora resolvido),
`LLMProviderGateway.processRequest` passou a aceitar um 4º parâmetro opcional `tenantId: string`
(default `SYSTEM_TENANT_ID = 'system'`), usado para marcar corretamente os spans/métricas gerados
por aquela chamada de LLM.

`src/services/telephonyService.ts:141` chama
`llmProviderGateway.processRequest(params.speechResult, 'GoogleGemini', systemInstruction)` sem
passar `tenantId`. Esse arquivo é propriedade exclusiva do Agente 05 (`AGENTS.md` seção 11), então
não editei diretamente.

Isso **não é um bloqueador de segurança** — como `tenantId` é opcional com default seguro
(`'system'`), a chamada continua compilando e nenhum dado vaza entre tenants (spans/métricas
`'system'` ficam explicitamente fora de qualquer resposta filtrada por tenant real, ver
`getSpans`/`getMetrics` em `lib/voice-runtime/otel.ts`). O efeito é apenas funcional: hoje, toda
observability de custo/latência de LLM gerada por ligações de telefonia reais é marcada como
`'system'` em vez do tenant real do agente/sessão, então ela nunca aparece no dashboard de
observability filtrado do tenant que efetivamente fez a ligação — reduz o valor do dado, não a
segurança.

## Arquivo(s) envolvido(s)
- `src/services/telephonyService.ts` (owner: Agente 05) — linha ~141, chamada a
  `llmProviderGateway.processRequest(...)`.

## Alteração necessária
Em `src/services/telephonyService.ts`, na chamada existente:
```ts
const gatewayResponse = await llmProviderGateway.processRequest(params.speechResult, 'GoogleGemini', systemInstruction);
```
passar o `tenantId` real disponível no escopo da função (o arquivo já usa `session.tenantId` em
outras chamadas próximas, ex. `callLogService.createCallLog(session.tenantId, ...)`):
```ts
const gatewayResponse = await llmProviderGateway.processRequest(params.speechResult, 'GoogleGemini', systemInstruction, session.tenantId);
```

## Teste esperado
- Uma chamada de telefonia real/mockada com `session.tenantId = 'tenant-x'` gera, após a mudança,
  spans/métricas no coletor com `tenantId === 'tenant-x'` (não `'system'`), verificável via
  `otelCollector.getSpans('tenant-x')`/`getMetrics('tenant-x')` depois da chamada.
- Nenhuma regressão nas chamadas de telefonia sem tenant resolvido ainda (fallback seguro continua
  sendo `'system'`, nunca lança exceção nem quebra o fluxo de telefonia).

## Contexto adicional
Assinatura completa após a correção (`lib/voice-runtime/providers/LLMGateway.ts`):
```ts
public async processRequest(
  prompt: string,
  preferredProvider: 'GoogleGemini' | 'OpenAI' | 'Claude' = 'GoogleGemini',
  systemInstruction: string = "...",
  tenantId: string = SYSTEM_TENANT_ID
): Promise<GatewayResponse>
```
`tenantId` foi adicionado como último parâmetro (não inserido no meio) exatamente para preservar
compatibilidade posicional com chamadores existentes como este, sem exigir edição imediata fora do
escopo do Agente 04.
