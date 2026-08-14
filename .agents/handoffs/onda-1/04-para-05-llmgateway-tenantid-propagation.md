- De: Agente 04 (Voice Runtime e Gateway de IA)
- Para: Agente 05 (Telefonia, Chamadas e Webhooks)
- Onda: 1
- Status: resolvido
- Prioridade: alto (elevada na Onda 2 — ver "Atualização Onda 2" abaixo)

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

## Atualização Onda 2 (prioridade elevada para "alto")

Na Onda 2 implementei o gate de consentimento de IA (LGPD, `AGENTS.md` bloqueador #8) em
`LLMGateway.ts`/`SessionManager.ts` — ver `.agents/handoffs/onda-2/04-para-01-ai-consent-schema.md`.
O gate verifica consentimento **por tenant real**; chamadas marcadas com o tenant sentinela
`SYSTEM_TENANT_ID = 'system'` (que é o que `telephonyService.ts` produz hoje, por não passar
`tenantId`) **pulam** a checagem propositalmente, para não bloquear 100% das chamadas de telefonia
reais de uma hora para outra sem aviso.

Isso significa que, enquanto este handoff continuar aberto, o gate de consentimento de IA
**não está de fato protegendo dados de contato reais processados via telefonia** — só protege
chamadas que já chegam com um tenant real (ex.: `/api/chat` do Playground). Assim que
`telephonyService.ts` passar `session.tenantId` real para `processRequest`, o gate de
consentimento passa a valer automaticamente para chamadas de telefonia também, sem qualquer
mudança adicional no Agente 04. Por isso a prioridade deste handoff subiu de "normal" para "alto"
nesta onda — ele agora bloqueia mais do que granularidade de observability, bloqueia o alcance
real da proteção de LGPD já implementada.

## Resolução — 2026-08-14

Resolvido na branch `codex/production-ready-20260814` / PR #33.

- `src/services/telephonyService.ts` agora passa `session.tenantId` em **todas** as chamadas do caminho telefônico ao `LLMProviderGateway`.
- O mesmo caminho passou a executar o snapshot do workflow ativo por tenant, sem perder o boundary de ownership da sessão.
- O gate de consentimento do gateway passou, portanto, a valer para dados de contato processados em chamadas reais, não apenas para o Playground.
- `__tests__/telephonyService.test.ts` exige explicitamente o quarto argumento `tenant-1` nas chamadas ao gateway e cobre o caso de consentimento bloqueado sem avançar o cursor do workflow.
- O gateway também passou a registrar `providerUsed: 'NONE'` quando todos os provedores falham, evitando atribuir custo/telemetria a um provider que não respondeu.

O fallback `SYSTEM_TENANT_ID` continua existindo apenas para operações de sistema que não carregam dados de um tenant real. Telefonia não depende mais desse fallback.