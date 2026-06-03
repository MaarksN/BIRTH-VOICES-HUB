# Relatorio de execucao de testes

STATUS: PARTIAL

Comandos executados:

| Verificacao | Comando | Resultado | Status |
|---|---|---|---|
| Git estado inicial | `git status --short --branch` | `main`, limpo | PASS |
| Node PATH padrao | `node --version` | `Acesso negado` | BLOCKED ambiental |
| Node runtime Codex | `node.exe --version` | `v24.14.0` | PASS |
| npm temporario | `node npm-cli.js --version` | `11.16.0` | PASS |
| Instalacao limpa tentativa 1 | `npm ci` | falhou por postinstall chamando node bloqueado | FAIL ambiental inicial |
| Instalacao limpa tentativa 2 | `npm ci` com PATH corrigido | 258 pacotes, 0 vulnerabilidades | PASS |
| Typecheck | `npm run typecheck` | sem erros | PASS |
| Build | `npm run build` | Vite + esbuild OK; JS 376.05 kB, gzip 107.41 kB | PASS |
| Smoke | `npm run smoke` | status/auth/agents/sessions/integration fallback OK | PASS |
| Audit deps | `npm audit --audit-level=low` | 0 vulnerabilidades | PASS |
| QA agregado | `npm run qa` via CLI temporario | falhou ao resolver `npm` interno no ambiente shim | PARTIAL |
| Lint | `npm run lint` | script ausente | FAIL |
| Format check | `npm run format:check` | script ausente | FAIL |
| Unit tests | `npm test` | script ausente | FAIL |
| E2E rotas | Playwright + Chrome | rotas renderizadas, sem pageerror | PASS |
| E2E playground completo | Playwright + Chrome | bloqueado antes de input habilitado | BLOCKED |
| Isolamento basico | Node script temporario | Usuario B nao acessou agente de A | PASS limitado |

Warnings relevantes:

- `node-domexception@1.0.0` deprecated durante `npm ci`.
- `npm` 11 informou scripts de instalacao pendentes de aprovacao: `@google/genai`, `esbuild`, `protobufjs`, `esbuild`.
- Browser console: Tailwind CDN nao deve ser usado em producao.

Conclusao: gates de build/typecheck/smoke passam; piramide de testes, lint e E2E critico completo nao existem ou ficaram bloqueados.

