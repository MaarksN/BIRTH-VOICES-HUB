# Auditoria de Documentacao e Manutenibilidade

STATUS: PARTIAL

## Documentacao

PASS:

- `README.md` explica objetivo, setup local, Gemini, webhook, Twilio e build.
- `.env.example` existe.
- `docs/qa/**` contem esta auditoria.

FAIL/PARTIAL:

- Sem OpenAPI/Swagger.
- Sem ADRs.
- Sem runbook operacional.
- Sem rollback/restore.
- Sem arquitetura antes desta auditoria.
- Sem guia de contribuicao/testes.
- Sem documentacao de privacidade/retencao/consentimento.

## Manutenibilidade

Ferramentas:

- Madge: sem dependencias circulares.
- JSCPD: 7 clones, 1.68% de linhas duplicadas.
- ts-prune: possiveis exports nao usados: `WebhookIntegration`, `D3Chart default`, `useVoiceConversation`, `ApiError` usado no modulo, etc.

Riscos:

- `server.ts` com 1297 linhas.
- `AgentForm.tsx` com 588 linhas.
- `Playground.tsx` com 560 linhas.
- Duplicacao em paginas de dashboard e Login/Register.
- Ausencia de lint/testes automatizados facilita regressao.

## Decisao

Documentacao de uso local e suficiente para outro dev subir o projeto, mas manutenibilidade de producao requer modularizacao, testes, lint, API docs e runbooks.
