# Inventario do repositorio

STATUS: PASS

Resumo:

- Total de arquivos relevantes detectados sem `node_modules`, `dist`, `build`, `coverage` e `out`: 34.
- Aplicacao: SPA React + Express no mesmo repositorio.
- Backend principal: `server.ts`.
- Frontend principal: `App.tsx`, `index.tsx`, `pages/`, `components/`, `hooks/`, `lib/`, `store/`.
- Scripts: `scripts/smoke-test.mjs`.
- Persistencia local ignorada pelo Git: `data/*.json`.
- Artefatos gerados e ignorados apos auditoria: `node_modules/`, `dist/`.

Arquivos principais:

| Arquivo | Linhas aproximadas | Observacao |
|---|---:|---|
| `server.ts` | 1297 | Backend Express, APIs, storage JSON, Twilio, Gemini e webhooks. |
| `components/AgentForm.tsx` | 588 | Formulario principal de agentes; contem templates e UI de integracoes parciais. |
| `pages/Dashboard/Playground.tsx` | 560 | Fluxo de conversa por voz/texto e salvamento de sessao. |
| `pages/Dashboard/Results.tsx` | 390 | Listagem, filtros, detalhes e CSV de sessoes. |
| `pages/Dashboard/Developers.tsx` | 370 | Webhook real, teste e historico de entregas. |
| `pages/Dashboard/Overview.tsx` | 296 | Metricas derivadas de agentes/sessoes reais. |
| `pages/Dashboard/Telephony.tsx` | 250 | UI de chamadas Twilio, dependente de credenciais. |
| `pages/Dashboard/Analytics.tsx` | 146 | Indicadores locais a partir de sessoes. |
| `pages/Dashboard/Billing.tsx` | 47 | Tela assumidamente sem gateway real. |

Stack detectada:

- Linguagem: TypeScript/TSX.
- Frontend: React 19, React Router 7, Zustand, D3, lucide-react, Tailwind via CDN em `index.html`.
- Backend: Express 5, Node.js, `@google/genai`.
- Build: Vite 6, esbuild.
- Persistencia: arquivo JSON local em `data/birth-voices.json`.
- Teste existente: smoke script customizado.
- CI/CD: nao encontrado.
- Docker/compose: nao encontrado.
- ORM/migrations: nao encontrados.
- E2E formal: nao encontrado.

Arquivos obrigatorios verificados:

| Item | Status |
|---|---|
| `package.json` | PASS |
| `package-lock.json` | PASS |
| `tsconfig.json` | PASS |
| `.env.example` | PASS |
| `.gitignore` | PASS |
| `README.md` | PASS |
| `scripts/smoke-test.mjs` | PASS |
| `.github/workflows/*` | FAIL: ausente |
| `Dockerfile` | FAIL: ausente |
| `docker-compose.yml`/`compose.yaml` | FAIL: ausente |
| `tests/` | FAIL: ausente |
| `e2e/` | FAIL: ausente |
| `prisma/`/`migrations/` | NOT APPLICABLE para ORM, mas FAIL para prontidao de banco |
| `SECURITY.md` | FAIL: ausente |
| `CODEOWNERS` | FAIL: ausente |

Pesquisa obrigatoria:

- `TODO`, `FIXME`, `HACK`, `STUB`, `NOT IMPLEMENTED`: sem ocorrencias relevantes no codigo-fonte atual.
- `mock`/`fake`: ocorrencias relevantes apenas no historico migrado e textos assumindo ausencia de dados ficticios; nao ha mocks ativos detectados nas telas principais.
- `console.log`: backend imprime startup; hook antigo usa log em erro de speech recognition.
- `any`: uso amplo em handlers, componentes e normalizadores.
- `localhost`, `127.0.0.1`, `example.com`: README e smoke test.
- `password`, `secret`, `token`: presentes por implementacao de autenticacao e webhook; sem segredo real versionado encontrado.

