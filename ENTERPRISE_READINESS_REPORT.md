# Enterprise Readiness Report — BIRTH-VOICES-HUB

**Branch:** `worktree-production-ready-stabilization` (criada a partir de `origin/main` @ `1cc2d37`, isolada em git worktree)
**Commit:** `fix: production stabilization — CI/CD, Docker/Prisma crashes, OWASP hardening, tech debt`
**Data:** 2026-07-16

## ⚠️ Nota operacional importante

Durante esta sessão foi detectado que **outras sessões de IA (incluindo pelo menos outra sessão Claude Code) estavam operando concorrentemente no mesmo repositório**, trocando branches e editando arquivos no mesmo working directory em disco. Havia também um PR aberto (#24, branch `claude/birth-voices-tech-debt-clqf97`) fazendo um trabalho parcialmente sobreposto (hardening de CI, remoção de exposição de secret no bundle client, Redis fail-fast).

Por instrução explícita, este trabalho foi isolado em um **git worktree próprio**, criado do zero a partir de `origin/main`, sem tocar em `main`, `pr22` ou qualquer branch de outro agente. Nada foi mergeado. Antes de abrir um PR a partir desta branch, revise se o PR #24 (se ainda aberto) já cobre parte do que está aqui, para evitar duplicação.

## Critérios pedidos — status

| Critério | Status | Observação |
|---|---|---|
| Build verde | ✅ | `npm run build` sem erros |
| Lint verde | ✅ | 0 erros, 49 warnings pré-existentes (`no-explicit-any`, não introduzidos por esta sessão) |
| TypeScript verde | ✅ | `strict: true` **ativado** e com 0 erros (ver seção própria) |
| Testes verdes | ✅ | 77/77 passando, contra Postgres + Redis reais (não mocks) |
| Docker funcionando | ✅ | Build + `docker run` validados de ponta a ponta contra Postgres/Redis reais: `/health`, arquivos estáticos, fallback SPA e fluxo real de registro/login todos testados manualmente |
| Prisma funcionando | ✅ | `migrate deploy` + `db seed` + queries reais funcionando dentro do container (corrigido bug de engine binary) |
| Redis funcionando | ✅ | Rate limiter e audit queue confirmados funcionando contra Redis real |
| CI funcionando | ✅* | `ci.yml`/`deploy.yml` corrigidos e validados sintaticamente; **não é possível confirmar execução real no GitHub Actions** sem acesso ao repositório remoto — ver seção de Secrets |
| Sem regressões | ✅ | Suite de 77 testes preexistente passando integralmente |
| Sem código morto novo | ✅ | Nenhum introduzido; alguns itens de código morto pré-existente foram removidos (ver Limpeza) |
| Sem imports mortos | ✅ | `vite.config.ts` tinha `loadEnv`/`env` órfãos após remover a exposição do `GEMINI_API_KEY` — removidos |
| Sem warnings críticos | ✅ | 0 erros de lint/typecheck |

## Bugs reais de produção corrigidos (confirmados rodando Docker de verdade)

Nenhum destes aparecia em `npm run build` isolado — só apareceram ao efetivamente construir e **rodar** a imagem Docker contra Postgres/Redis reais, o que o `ci.yml` atual nunca fazia (só builda e salva o artefato).

1. **`Cannot find module 'vite'` em produção** — `server.ts` importava `vite` estaticamente no topo do arquivo; `vite` é `devDependency` e não existe na imagem final. Corrigido com `import()` dinâmico, usado só no branch de desenvolvimento.
2. **Crash total em toda rota no Express 5** — `app.get('*', ...)` (fallback SPA) usa sintaxe de wildcard que o Express 5 (via `path-to-regexp` v6+) não aceita mais. Corrigido para `app.get('/*splat', ...)`.
3. **Prisma incompatível com o Alpine em produção** — o engine baixado era da variante OpenSSL 1.1, mas `node:20-alpine` usa OpenSSL 3.x, e a imagem nem tinha o pacote `openssl` instalado (então a detecção de plataforma do Prisma falhava silenciosamente). Corrigido com `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` no schema + `apk add openssl` nos três estágios do Dockerfile.
4. **Vitest capturando specs do Playwright** — sem `exclude` configurado, qualquer arquivo `e2e/*.spec.ts` adicionado futuramente quebraria `npm test`. Corrigido no `vite.config.ts`.

## Segurança (OWASP)

| Item | Antes | Depois |
|---|---|---|
| CSRF | bypass de `localhost` valia em qualquer ambiente; request sem `Origin` passava sempre | bypass só fora de produção; em produção, mutação sem `Origin` é rejeitada |
| Rate limit | só 200 req/60s global, igual para login/registro e todo o resto | +limiter dedicado de 10 req/60s em `/api/auth/login` e `/api/auth/register` (desativado em `NODE_ENV=test` para não interferir nos testes) |
| CSP | bloqueava os próprios recursos do app (Tailwind CDN, Google Fonts) por falta de allowlist | Tailwind CDN e Google Fonts allowlisted; adicionado `object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests` |
| Cookies | dois helpers divergentes; um sem `maxAge` (virava cookie de sessão do browser mesmo com JWT de 15 min) | unificados em `src/lib/cookies.ts`, `maxAge` alinhado ao TTL real do JWT (15 min / 30 dias) |
| Secrets no bundle | `GEMINI_API_KEY` injetado no bundle client via `vite.config.ts` `define`, sem nenhum consumidor no frontend | exposição removida (só há consumidor backend) |
| `.env` no git | rastreado no repositório (valores dummy, não reais) | desrastreado, adicionado ao `.gitignore` |
| `npm audit` | 3 vulnerabilidades (esbuild, protobufjs, vite — todas de dev-server, não de runtime) | 0 vulnerabilidades, sem bump major |
| SQL Injection | já seguro (só Prisma ORM, um único `$queryRaw` estático de health-check) | inalterado, confirmado seguro |
| XSS | nenhum `dangerouslySetInnerHTML` no código | inalterado, confirmado seguro |
| Helmet/headers | base já presente | mantida + diretivas adicionais acima |

## GitHub Actions

- `ci.yml` / `deploy.yml`: já usavam versões atuais de actions (`checkout@v4`, `setup-node@v4`, `google-github-actions/*@v2`) — nenhuma versão depreciada encontrada.
- Adicionado `permissions: contents: read` e `concurrency` (cancela runs supersedidos) nos dois workflows.
- `deploy.yml` agora falha rápido com mensagem clara se secrets obrigatórios estiverem ausentes, em vez de um erro opaco de autenticação no meio do job.
- `deploy.yml`: `JWT_SECRET`, `REFRESH_TOKEN_SECRET` e `ALLOWED_ORIGINS` agora são passados ao Cloud Run (antes ausentes — o serviço quebraria na primeira operação de auth, já que `requireSecret()` lança exceção se essas variáveis não existirem).
- Sintaxe YAML de ambos os arquivos validada.

### Secrets do GitHub necessários (nenhum valor foi inventado)

Configurar em **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Usado por | Obrigatório para |
|---|---|---|
| `GCP_PROJECT_ID` | `deploy.yml` | Deploy no Cloud Run |
| `GCP_SA_KEY` (ou `GCP_CREDENTIALS` como fallback) | `deploy.yml` | Autenticação Google Cloud |
| `PRODUCTION_DATABASE_URL` | `deploy.yml` | Conexão Postgres de produção |
| `PRODUCTION_REDIS_URL` | `deploy.yml` | Conexão Redis de produção |
| `GEMINI_API_KEY` | `deploy.yml` | Funcionalidades de IA generativa |
| `JWT_SECRET` | `deploy.yml` | Assinatura de access tokens — **sem isso o serviço já sobe quebrado** |
| `REFRESH_TOKEN_SECRET` | `deploy.yml` | Assinatura de refresh tokens — **idem** |
| `PRODUCTION_ALLOWED_ORIGINS` (opcional, recomendado) | `deploy.yml` | Sem isso, CORS cai no fallback `http://localhost:$PORT`, o que rejeitaria o domínio real de produção |

`ci.yml` não precisa de nenhum secret novo — já usa valores dummy próprios para o ambiente de CI (`ci_jwt_secret_do_not_use_in_production` etc.), isolados da produção.

## Dívida técnica corrigida

- **ESLint**: config duplicado (`eslint.config.js` + `eslint.config.mjs`, o segundo nunca carregado) já havia sido removido em commit anterior a esta sessão — confirmado, nada a fazer.
- **Logger central**: criado `src/lib/logger.ts`; todas as chamadas `console.*` do código backend/Node (server.ts, controllers, services, providers do voice-runtime, otelInitializer, prisma seed) substituídas. `console.*` no código frontend (componentes React) foi **deixado como está** — trocar ~10 arquivos de UI por um logger de browser é decisão separada, de menor risco/benefício, e não crítica para produção.
- **TypeScript strict mode**: ativado com sucesso. Só 4 erros no total em 3 arquivos, todos corrigidos sem alterar comportamento (tipo de mock em teste, assinatura de callback do D3, campo redundante no `ErrorBoundary`).
- **Vitest coverage**: `@vitest/coverage-v8` estava instalado mas nunca conectado — adicionado bloco `coverage` (provider v8) e script `test:coverage`, sem alterar o `test` padrão usado pelo CI.
- **God Component**: `pages/Dashboard/Developers.tsx` (385 linhas) refatorado — lógica de API keys/webhooks extraída para `hooks/useDeveloperSettings.ts` (132 linhas), componente reduzido a 304 linhas de JSX puro.
- **Arquivos órfãos removidos**: `report.md`, `migrated_prompt_history/` (1.1MB, dump de histórico de prompts) — confirmado sem nenhuma referência em código/CI antes de remover.
- **`coverage/`** (77 arquivos de relatório de teste) desrastreado do git.

## Dívida técnica remanescente (documentada, não implementada)

Itens identificados mas deliberadamente **não tocados** nesta rodada — risco/esforço não justificava a mudança sem alteração de regra de negócio ou risco de regressão maior:

- **Bundle `VoiceStudio` de ~1MB** — chunk maior que 500kB no build de produção. Recomendação: `React.lazy`/code-splitting por rota. Não implementado (mudança estrutural maior, fora do escopo de "correção").
- **Acoplamento de `src/controllers/*` com internals de `lib/voice-runtime`** via `export *` — os controllers importam diretamente da implementação interna do runtime de voz em vez de uma interface estreita. Refatorar isso é uma mudança arquitetural maior; documentado, não implementado.
- **`console.*` remanescente no frontend** (~10 arquivos React/hooks) — ver acima.
- **`~49` warnings de `no-explicit-any`** — pré-existentes, não introduzidos nesta sessão; eliminá-los exigiria re-tipar ~15 arquivos, principalmente em `workflowService`/`workflowCollabService` e providers de IA.

## Verificação executada

```
npm ci                    ✅ (lockfile em sincronia)
npm audit                 ✅ (0 vulnerabilidades após fix)
npm run lint               ✅ (0 erros)
npx tsc --noEmit            ✅ (strict mode, 0 erros)
npm test                   ✅ (77/77, Postgres+Redis reais)
npm run build               ✅
docker build                ✅ (sem warnings)
docker run + curl:
  /health                    → 200
  / (estático)                → 200
  rota SPA arbitrária          → 200 (fallback funcionando)
  POST /api/auth/register       → 200, cookies com maxAge corretos
  POST /api/auth/login (origem errada) → 403 (CSRF)
  11x POST /api/auth/login rápidos → 401×8, 429×3 (rate limit de auth funcionando)
```
