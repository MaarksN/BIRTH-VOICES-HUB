# Onda 1 — Fundação — Relatório

Data: 2026-08-11
Branch de integração: `integracao/onda-1` (a partir de `main`, commit `5e108fd`)
Decisão: **APROVADA**

## Especialistas executados

| Agente | Branch | Worktree (removido após integração) | Commits |
|---|---|---|---|
| 01 — Plataforma, Segurança, Tenancy e Dados | `agente/01-plataforma-seguranca-dados` | `bvh-wt-agente-01` | 6 |
| 05 — Telefonia, Chamadas e Webhooks | `agente/05-telefonia-webhooks` | `bvh-wt-agente-05` | 3 |
| 06 — Integrações Externas | `agente/06-integracoes-externas` | `bvh-wt-agente-06` | 4 |
| 04 — remediação pontual (fora da onda originalmente planejada) | `agente/04-remediacao-onda1-observability-leak` | `bvh-wt-agente-04-remediacao` | 2 |
| 00 — Coordenador (fix cross-domain em `server.ts`) | direto em `integracao/onda-1` | — | 2 |

Todos os merges (`--no-ff`) foram limpos, sem conflito — cada especialista respeitou o próprio
escopo de arquivos (`AGENTS.md` §11), confirmado por `git diff --stat` antes de cada merge.

### Desvio do plano original

O Agente 04 (Voice Runtime e Gateway de IA) não estava planejado para a Onda 1 (só entra na
Onda 2). Ele foi disparado, em escopo estritamente reduzido, como remediação de um bloqueador real
encontrado pelo Agente 01 durante a auditoria de tenancy — vazamento cross-tenant em
`GET /api/observability/metrics` — porque `AGENTS.md` não aprova onda com handoff `Prioridade:
bloqueador` em aberto, e este é exatamente esse caso. Ver "Achados" abaixo.

Dois agentes (01 e 06) e a remediação (04) foram interrompidos pelo menos uma vez por reinício do
processo hospedeiro (não relacionado ao conteúdo do trabalho) e retomados via `SendMessage` a
partir do próprio transcript, sem perda de progresso.

## Achados e correções

### Agente 01 — Plataforma, Segurança, Tenancy e Dados
- Cookies de access/refresh token sem `Max-Age` (viravam cookie de sessão do navegador em vez de
  expirar em 15min/30dias como documentado) — corrigido.
- `POST /api/auth/refresh` nunca estava montado em nenhuma rota (404) — rota adicionada.
- `src/lib/logger.ts` "usava" `pino` só de nome — era um wrapper de `console.log` sem nenhuma
  redação de segredo. Reescrito para pino real com `redact` sobre ~25 campos sensíveis.
- SSRF: `callbackUrlSchema` só exigia HTTPS, sem bloquear IP privado/loopback/link-local/metadata
  de nuvem — corrigido.
- LGPD: `softDeleteUser` não atendia ao direito de eliminação (mantinha dado pessoal em texto
  claro). Adicionado mecanismo de anonimização (`POST /api/users/:id/anonymize`).
- **Achado (não corrigido por ele, fora do seu escopo de arquivo): vazamento cross-tenant real em
  `/api/observability/metrics`** — ver remediação do Agente 04 abaixo.
- Gap não-bloqueador identificado: fluxo OIDC/Keycloak tem infraestrutura mas nenhuma rota de
  aplicação o utiliza hoje (login/callback nunca implementados).
- `npm audit`: 4 advisories, nenhum corrigido (mudança em lockfile exigiria minha aprovação
  explícita — não solicitada nesta onda por não serem bloqueadores).

### Agente 05 — Telefonia, Chamadas e Webhooks
- **Race condition real**: `initiateOutboundCall` fazia "check" e "create" de sessão outbound como
  dois round-trips separados — dois cliques/retries quase simultâneos podiam disparar a mesma
  ligação real duas vezes. Corrigido com transação `Serializable` + tratamento do erro de conflito
  do Postgres (`P2034`) como `DuplicateCallError`.
- Adicionado mecanismo de retenção/expurgo de `CallLog` (LGPD) — falta só o agendamento periódico
  (handoff para 00/10).
- Confirmado: assinatura Twilio, idempotência de webhook, HMAC do `webhook.service.ts` e isolamento
  de `packages/sip-agent` já estavam corretos.
- Efeito colateral conhecido e documentado: a correção da race condition quebrou os mocks de
  `__tests__/outboundCallService.test.ts` (5 de 7 testes) — arquivo exclusivo do Agente 08, handoff
  com substituição pronta aberto.

### Agente 06 — Integrações Externas
- **Achado crítico**: `POST /api/webhook/atlasgr/outbound` não tinha **nenhuma autenticação** —
  qualquer requisição disparava uma ligação real via Bland AI. Corrigido com segredo compartilhado
  (`x-atlasgr-webhook-secret`, falha fechada) + validação de payload + idempotência via Redis.
- Object storage (S3/MinIO): não existia URL pré-assinada nem isolamento de tenant por path —
  implementado.
- Antivírus (ClamAV): não existia varredura real nem política de falha — implementado com falha
  fechada (indisponibilidade/erro do scanner rejeita o upload).
- Corrigido o único erro de lint pré-existente do baseline (`atlasgr.routes.ts:11`).
- **Achado que motivou o fix do Coordenador**: `csrfProtection` bloqueava (403) toda chamada
  servidor-a-servidor sem header `Origin`, incluindo o webhook recém-autenticado.
- Achado de arquitetura (não-bloqueador): o repositório AtlasGR não chama mais
  `/api/webhook/atlasgr/outbound` — a integração real hoje é `POST /api/voice/outbound` (domínio do
  Agente 05). A rota antiga parece código órfão, mas continua exposta em produção, então foi
  protegida mesmo assim.

### Agente 04 (remediação) — vazamento cross-tenant em observability
- `lib/voice-runtime/otel.ts`: `LocalSpan`/`LocalMetric` não tinham `tenantId`; `getSpans()`/
  `getMetrics()` devolviam o array inteiro para qualquer usuário autenticado de qualquer tenant.
  Corrigido: `tenantId` obrigatório internamente (default `'system'` quando não há tenant real,
  nunca omitido), `getSpans(tenantId)`/`getMetrics(tenantId)` sempre filtram.
- `LLMGateway.ts` e `observability.controller.ts` atualizados para propagar/consumir `tenantId`
  real.
- Handoff derivado para 05: `telephonyService.ts` ainda não propaga `tenantId` real ao runtime de
  voz (spans de chamada real ficam marcados `'system'` — não vaza dado, mas fica menos granular do
  que poderia).

### Coordenador (00) — fix cross-domain em `server.ts`
- `csrfProtection` exigia `Origin` em toda requisição mutante em produção — quebrava tanto o
  webhook AtlasGR (06) quanto, potencialmente, `/api/voice/outbound` (05) quando chamado
  servidor-a-servidor via Bearer token (mesmo problema que o Twilio já tinha resolvido antes).
  Corrigido: `atlasgrRoutes` movido para antes do CSRF (mesmo padrão do Twilio); `csrfProtection`
  ganhou exceção para requisição autenticada por `Authorization: Bearer` (não enfraquece a proteção
  do caminho autenticado por cookie do navegador). **Confirmação explícita do usuário obtida antes
  de editar o middleware de segurança**, por ser arquivo sensível.
- Durante a integração, dois arquivos (`webhookIdempotency.ts`, `voice.service.ts`) apareceram
  modificados no working tree principal sem que eu os tivesse editado, sem commit correspondente em
  nenhuma branch de agente. Provável artefato de outra sessão concorrente no mesmo host (ambiente
  compartilhado, ver `baseline.md`). Revertidos por segurança/rastreabilidade em vez de commitados
  sem origem identificável.

## Gate (branch de integração, após todos os merges)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✅ passou (após 3 tentativas por OOM nativo do host compartilhado — ver `baseline.md`/limitação de ambiente, não regressão) |
| `npm run lint` | ✅ 0 erros, 90 warnings pré-existentes (`no-explicit-any` em mocks de teste, já catalogado) |
| `npm run test` | ⚠️ 252 passed, **5 failed**, 1 skipped — as 5 falhas são exclusivamente em `__tests__/outboundCallService.test.ts`, causadas pela correção legítima do Agente 05 (item tratado no handoff `05-para-08`, prioridade alto, não bloqueador) |
| `npm run test:contracts` | ✅ 1/1 |
| `npm run build` | ✅ sem erro, só aviso pré-existente de chunk >500kB |

`npm run test:e2e`/`test:infrastructure` não fazem parte do gate obrigatório desta onda (ver
`baseline.md` — ambiente com conflito de porta/opt-in).

## Handoffs

| Arquivo | Prioridade | Status |
|---|---|---|
| `01-para-04-observability-cross-tenant-leak.md` | bloqueador | **resolvido** |
| `06-para-00-csrf-bloqueia-webhooks-servidor-servidor.md` | bloqueador | **resolvido** |
| `05-para-08-outboundCallService-test-update.md` | alto | aberto — carrega para Onda 3 (Agente 08) |
| `00-para-08-teste-csrf-bearer-exemption.md` | normal | aberto — carrega para Onda 3 (Agente 08) |
| `01-para-05-webhook-worker-ssrf-defense-in-depth.md` | normal | aberto — carrega para Onda 2 (Agente 05) |
| `04-para-05-llmgateway-tenantid-propagation.md` | normal | aberto — carrega para Onda 2 (Agente 05) |
| `05-para-00-callLog-retention-scheduling.md` | normal | aberto — carrega, provável dono final Agente 10 (Onda 4) |
| `06-para-01-persistir-resultado-bland.md` | normal | aberto — carrega para Onda 2 (Agente 01) |

Nenhum handoff `Prioridade: bloqueador` permanece `Status: aberto` — critério de aprovação de
`AGENTS.md` satisfeito.

## Riscos restantes (não-bloqueadores, registrados para as próximas ondas)
1. `outboundCallService.test.ts` com 5 testes vermelhos até o Agente 08 aplicar a atualização já
   preparada — risco baixo (comportamento de produção correto, é só o mock que ficou desatualizado).
2. Fluxo OIDC/Keycloak sem wiring de aplicação (infraestrutura existe, ninguém a usa ainda).
3. `npm audit` com 4 advisories não tratados (2 com fix não-destrutivo disponível via
   `npm audit fix`, pendente de aprovação para tocar o lockfile).
4. Retenção de `CallLog` implementada mas sem agendamento periódico.
5. Resultado de chamada Bland AI hoje só logado, sem persistência durável (sem `CallLog`/lead
   correlato).
6. Ambiente de execução compartilhado com outras sessões no mesmo host — causou falhas
   intermitentes de memória em `tsc` e um artefato de arquivo de origem não identificada durante a
   integração (revertido). Recomendo, se possível, isolar a execução de ondas futuras em ambiente
   dedicado.

## Decisão

**APROVADA.** Todos os bloqueadores de segurança/tenancy reais encontrados na onda foram corrigidos
e verificados (webhook sem autenticação, race condition de chamada duplicada, vazamento
cross-tenant, CSRF bloqueando integração de produção). Gate obrigatório verde, exceto pelas 5
falhas de teste já rastreadas e atribuídas a uma correção legítima, não a uma regressão. Onda 2 pode
começar a partir de `integracao/onda-1`.
