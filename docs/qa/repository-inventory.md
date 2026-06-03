# Inventario do Repositorio

STATUS: PASS

## Estrutura

Repositorio pequeno de aplicacao web full-stack local:

| Area | Arquivos |
|---|---|
| Frontend | `App.tsx`, `index.tsx`, `index.css`, `pages/**`, `components/**`, `hooks/**`, `store/**` |
| Backend | `server.ts` |
| API client/Auth | `lib/api.ts`, `lib/auth.ts` |
| Tipos | `types.ts` |
| Build/config | `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json` |
| Smoke | `scripts/smoke-test.mjs` |
| Assets | `public/assets/voice-ops-hero.png` |
| Auditoria | `docs/qa/**` |

## Contagem por extensao

| Extensao | Quantidade |
|---|---:|
| `.md` | 23 |
| `.tsx` | 17 |
| `.ts` | 8 |
| `.json` | 5 |
| `.css` | 1 |
| `.mjs` | 1 |
| `.png` | 1 |

## Stack

- React 19, React Router 7, Vite 6.
- Express 5 em TypeScript.
- Persistencia local JSON em `data/birth-voices.json` ou `BIRTH_VOICES_DATA_DIR`.
- Google Gemini via `@google/genai`.
- Twilio via chamada HTTP direta para API REST.
- D3 para visualizacao.
- Zustand para store de UI.
- Sem ORM, banco relacional, migrations, filas, cache, IaC ou CI.

## Scripts

| Script | Status |
|---|---|
| `dev` | INFERRED, nao executado; usa `tsx server.ts`. |
| `build` | PASS. |
| `start` | INFERRED, `node dist/server.cjs`. |
| `preview` | NOT TESTED. |
| `typecheck` | PASS. |
| `smoke` | PASS. |
| `qa` | PASS com shim temporario de `npm.cmd`. |
| `lint` | MISSING. |
| `test` | MISSING. |

## Achados de inventario

- `server.ts` concentra backend, persistencia, auth, Gemini, Twilio, webhooks e roteamento em 1297 linhas.
- `components/AgentForm.tsx` tem 588 linhas, `pages/Dashboard/Playground.tsx` 560, `pages/Dashboard/Results.tsx` 390 e `Developers.tsx` 370.
- `rg` encontrou 0 arquivos `*.test.*` ou `*.spec.*`.
- `rg` encontrou 3 ocorrencias de `console.log`/`console.error` em codigo TS/TSX fora de `dist`/`node_modules`.
- Nao ha `.github/workflows`, Dockerfile, Terraform/Pulumi, migrations SQL ou `schema.prisma`.
