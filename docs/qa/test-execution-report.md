# Relatorio de Execucao de Testes

STATUS: PASS para gates locais automatizados; E2E depende do browser Playwright instalado no ambiente.

## Comandos atuais

| Verificacao | Comando | Resultado esperado | Status |
|---|---|---|---|
| Instalacao limpa | `npm ci` | dependencias reproduziveis pelo lockfile | PASS |
| Lint | `npm run lint` | ESLint sem erros | PASS |
| Unit tests | `npm run test` | Vitest unitario sem falhas | PASS |
| Integration | `npm run test:integration` | API real com storage isolado, auth, tenancy, privacy, Twilio guard, webhooks e readiness | PASS |
| Typecheck | `npm run typecheck` | `tsc --noEmit` sem erros | PASS |
| Build | `npm run build` | bundle Vite e servidor Node em `dist/` | PASS |
| Smoke | `npm run smoke` | status, headers, auth, agentes, sessoes e fallback de integracao saudaveis | PASS |
| Dependency audit | `npm audit --audit-level=low` | 0 vulnerabilidades conhecidas no nivel exigido | PASS |
| E2E | `npm run test:e2e` | Playwright Chromium valida app de producao e `/api/status` | PASS quando `npx playwright install chromium` ja foi executado no runner |

## Cobertura automatizada versionada

- Testes unitarios cobrem formatacao e tratamento de erros.
- Testes de integracao cobrem armazenamento isolado, headers de seguranca, health, readiness, autenticacao, logout, isolamento multi-tenant, permissoes, agentes, sessoes, webhooks, guard SSRF, assinatura Twilio, privacidade/export/delete e auditoria.
- Smoke script exercita o servidor construido, status, headers, auth, agentes, sessoes e fallback seguro de integracao.
- Playwright versionado valida o app de producao servido pelo backend empacotado.

## Limitacoes externas

Gemini, Twilio, webhook de CRM/ATS, staging e producao exigem credenciais/URLs reais fora do repositorio. A plataforma expoe `GET /api/readiness` para sinalizar `ready`, `degraded` ou `not_ready` com detalhes objetivos de cada integracao.
