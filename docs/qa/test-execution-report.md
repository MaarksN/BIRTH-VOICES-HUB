# Relatorio de Execucao de Testes

STATUS: FAIL para piramide automatizada; PASS para smoke local

## Comandos

| Verificacao | Comando | Resultado | Status |
|---|---|---|---|
| Instalacao limpa | `npm ci` com NPM temporario 11.16.0 | 258 pacotes instalados, 259 auditados, 0 vulnerabilidades | PASS |
| Typecheck | `npm run typecheck` | `tsc --noEmit` sem erro | PASS |
| Lint | `npm run lint` | `Missing script: "lint"` | FAIL |
| Build | `npm run build` | Vite + esbuild concluidos | PASS |
| Unit tests | `npm run test` | `Missing script: "test"` | FAIL |
| Coverage | `npm run test:coverage` | `Missing script: "test:coverage"` | FAIL |
| Integration | `npm run test:integration` | `Missing script: "test:integration"` | FAIL |
| Smoke | `npm run smoke` | `Smoke test passed: status, auth, agents, sessions and integration fallback are healthy.` | PASS |
| QA agregado | `npm run qa` | PASS com shim temporario de `npm.cmd` | PASS |
| Dependency audit | `npm audit --audit-level=low` | 0 vulnerabilidades | PASS |
| Madge | `npm exec --yes madge ...` | Sem ciclos | PASS |
| JSCPD | `npm exec --yes jscpd ...` | 7 clones, 1.68% linhas duplicadas | PARTIAL |
| ts-prune | `npm exec --yes ts-prune` | exports possivelmente nao usados listados | PARTIAL |

## Testes dinamicos adicionais

- API isolation test customizado: PASS.
- Browser E2E manual: PASS para fluxo local principal.

## Lacunas

- Nao ha arquivos `*.test.*` ou `*.spec.*`.
- Nao ha Vitest/Jest/Testing Library configurado.
- Nao ha Playwright/Cypress versionado no projeto.
- Nao ha testes de contrato, banco, integracao externa, seguranca ou performance.

## Decisao

O produto funciona localmente nos fluxos testados, mas a piramide automatizada e insuficiente. Gate de producao permanece FAIL enquanto lint e testes essenciais nao existirem.
