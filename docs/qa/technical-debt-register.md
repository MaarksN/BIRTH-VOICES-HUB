# Registro Consolidado de Divida Tecnica

STATUS: Divida presente

## Resumo

| Prioridade | Quantidade | Bloqueia producao |
|---|---:|---|
| P0 | 0 | Nao |
| P1 | 8 | Sim |
| P2 | 5 | Parcial |
| P3 | 2 | Nao |
| P4 | 0 | Nao |

## Itens

| ID | Tipo | Area | Problema | P | Sev | ICE | Esforco | Bloqueia |
|---|---|---|---|---|---|---:|---|---|
| DT-001 | 03 | Testes | Sem `lint`, `test`, `coverage`, `integration` e sem arquivos de teste. | P1 | ALTA | 14.4 | M | SIM |
| DT-002 | 04 | Infra/DevOps | Sem CI/CD, Docker, IaC, staging validado ou deploy reproduzivel. | P1 | ALTA | 11.2 | M | SIM |
| DT-003 | 05 | Seguranca | Sem headers de seguranca, rate limiting, helmet/cookies seguros. | P1 | ALTA | 13.3 | M | SIM |
| DT-004 | 05/11 | Seguranca | Tokens em `localStorage` e tokens/secrets persistidos em JSON. | P1 | ALTA | 12.5 | M | SIM |
| DT-005 | 11 | Compliance | Sem consentimento, retencao, exclusao real, portabilidade completa e auditoria imutavel. | P1 | ALTA | 12.6 | L | SIM |
| DT-006 | 06 | Dados | Persistencia JSON sem migrations, backup, restore, indices ou transacoes reais. | P1 | ALTA | 11.2 | L | SIM |
| DT-007 | 05 | Seguranca/API | Webhook configuravel permite HTTP e nao tem protecao SSRF; Twilio callbacks sem assinatura. | P1 | ALTA | 13.0 | M | SIM |
| DT-008 | 09 | Multi-tenancy | Isolamento por `ownerId` passou, mas sem tenant formal/RBAC/quota. | P2 | MEDIA | 12.9 | L | NAO imediato |
| DT-009 | 08 | Observabilidade | Sem tracing, logs estruturados, `request_id`, alertas ou SLO. | P2 | MEDIA | 10.7 | M | NAO imediato |
| DT-010 | 01/02 | Arquitetura | `server.ts` monolitico (1297 linhas) e componentes grandes. | P2 | MEDIA | 21.0 | M | NAO imediato |
| DT-011 | 10 | Billing | Billing/metering e UI informativa; sem provedor/back-end. | P2 | MEDIA | 12.3 | L | Depende do escopo |
| DT-012 | 11/UX | Acessibilidade | Inputs com labels visuais sem associacao semantica. | P2 | MEDIA | 10.0 | S | NAO imediato |
| DT-013 | 07 | Documentacao | Sem OpenAPI, ADRs, runbook, rollback e guia de testes. | P3 | MEDIA | 5.6 | M | NAO |
| DT-014 | 02 | Codigo | JSCPD achou 7 clones; ts-prune listou exports possivelmente mortos. | P3 | BAIXA | 7.7 | S | NAO |
| DT-015 | 04/09 | Operacao | Smoke staging/producao e integracoes externas nao executados. | P1 | ALTA | 12.0 | M | SIM |

## Detalhes por tipo

### TIPO 01 - Divida arquitetural

STATUS: Divida presente
SEVERIDADE: MEDIA
ICE: Impact=9, Confidence=7, Effort=3 -> 21.0

Achados:

1. `server.ts` tem 1297 linhas e concentra API, auth, persistencia, Gemini, Twilio e webhooks.
2. `components/AgentForm.tsx` tem 588 linhas e `Playground.tsx` 560.
3. Madge nao encontrou ciclos, portanto o risco e concentracao/acoplamento, nao dependencia circular.

Acoes: separar servicos de auth/persistencia/integracoes; criar camada repository; extrair componentes grandes.

### TIPO 02 - Divida de codigo

STATUS: Divida presente
SEVERIDADE: BAIXA/MEDIA
ICE: Impact=6, Confidence=9, Effort=7 -> 7.7

Achados:

1. JSCPD: 7 clones, 110 linhas duplicadas.
2. Duplicacao Login/Register e stat cards de dashboards.
3. ts-prune: `useVoiceConversation`, `D3Chart`, `WebhookIntegration` possivelmente nao usados.

Acoes: adicionar lint; remover exports mortos; criar componentes compartilhados.

### TIPO 03 - Divida de testes

STATUS: Divida critica
SEVERIDADE: ALTA
ICE: Impact=8, Confidence=9, Effort=5 -> 14.4

Achados:

1. 0 arquivos `*.test.*`/`*.spec.*`.
2. `npm run test`: missing script.
3. `npm run test:coverage` e `test:integration`: missing script.

Acoes: adicionar Vitest/Testing Library; criar testes API; versionar Playwright.

### TIPO 04 - Infra/DevOps

STATUS: Divida critica
SEVERIDADE: ALTA
ICE: Impact=7, Confidence=8, Effort=5 -> 11.2

Achados:

1. `.github/workflows` ausente.
2. Dockerfile ausente.
3. Staging/producao nao validaveis.

Acoes: CI com ci/typecheck/lint/test/build/audit/smoke; Dockerfile; ambiente staging.

### TIPO 05 - Seguranca

STATUS: Divida critica
SEVERIDADE: ALTA
ICE: Impact=10, Confidence=8, Effort=6 -> 13.3

Achados:

1. Headers HTTP de seguranca ausentes.
2. Tokens em localStorage e JSON.
3. Webhooks/Twilio sem hardening suficiente.

Acoes: helmet/rate limit/cookies seguros; validar Twilio signature; SSRF guard.

### TIPO 06 - Dados

STATUS: Divida presente
SEVERIDADE: ALTA
ICE: Impact=8, Confidence=7, Effort=5 -> 11.2

Achados:

1. JSON local sem migrations.
2. Sem backup/restore.
3. Sem indices/constraints/transacoes.

Acoes: banco gerenciado; migrations; backup/restore testado.

### TIPO 07 - Documentacao

STATUS: Divida presente
SEVERIDADE: MEDIA
ICE: Impact=5, Confidence=9, Effort=8 -> 5.6

Achados: sem OpenAPI, runbook, rollback, ADRs.

### TIPO 08 - Observabilidade

STATUS: Divida presente
SEVERIDADE: MEDIA
ICE: Impact=8, Confidence=8, Effort=6 -> 10.7

Achados: sem tracing, logs estruturados, alertas e SLO.

### TIPO 09 - Multi-Tenancy

STATUS: Divida presente
SEVERIDADE: MEDIA
ICE: Impact=10, Confidence=9, Effort=7 -> 12.9

Achados: owner isolation passou, mas sem tenant formal, roles, quota.

### TIPO 10 - Billing/Metering

STATUS: Divida presente
SEVERIDADE: MEDIA
ICE: Impact=7, Confidence=7, Effort=4 -> 12.3

Achados: tela declara ausencia de provedor; sem metering/cobranca real.

### TIPO 11 - Compliance LGPD/GDPR

STATUS: Divida critica
SEVERIDADE: ALTA
ICE: Impact=9, Confidence=7, Effort=5 -> 12.6

Achados: sem consentimento, retencao, delete/export completo, auditoria imutavel.
