# Auditoria Técnica — Documento Vivo

**Última atualização:** 2026-08-02
**Substitui:** `AUDIT_REPORT_2026-07-16.md`, `AUDIT_REPORT_ENTERPRISE_EVOLUTION.md`, `ENTERPRISE_READINESS_REPORT.md`, `docs/EXECUTIVE_STABILIZATION_REPORT.md` (removidos — conteúdo consolidado abaixo, ver [Histórico dos relatórios substituídos](#histórico-dos-relatórios-substituídos)).

**Regra deste documento:** ele é único e vivo. Novos ciclos de auditoria **editam este arquivo** (atualizando as seções relevantes e o changelog no fim) em vez de criar `AUDIT_REPORT_*.md` novos. Isso evita a divergência que motivou esta consolidação: relatórios antigos afirmando coisas que o código atual já não confirma (ex.: um relatório dizia ter adicionado um script `test:coverage` ao `package.json` — nunca existiu; o que existe é `npm run test -- --coverage`, documentado em [TESTING.md](../TESTING.md)).

---

## 1. Estado verificado agora (2026-08-02)

Verificado diretamente no working tree nesta data — não é um relatório de terceiros, é leitura do código/config atuais.

| Item | Estado | Evidência |
|---|---|---|
| `npm run lint` | Config única (`eslint.config.js`); o `.mjs` órfão citado em relatórios antigos já não existe | `ls eslint.config.*` |
| TypeScript strict | Ativo | `tsconfig.json` → `"strict": true` |
| `.env` | Não versionado, presente no `.gitignore` | `git ls-files` / `.gitignore:17` |
| `coverage/` | Não versionado | `git ls-files` |
| Cobertura de testes (Vitest) | Config `coverage` (provider v8, thresholds 40/40/35/55) existe em `vite.config.ts`, mas **como alteração não commitada** no momento desta auditoria — confirmar se foi commitada antes de assumir que está em `main` | `git diff vite.config.ts` |
| Script `test:coverage` | **Não existe** no `package.json`. Uso real é `npm run test -- --coverage` (ver `TESTING.md`) | `package.json` scripts |
| `settingRepository.upsertSetting` | Reescrito (findFirst + create/update, com tratamento de corrida via `P2002`) — bug de `null` em chave composta do Prisma **corrigido** | `src/repositories/settingRepository.ts` |
| `workflowCollabService` — race condition | **Corrigida**: updates agora passam por `workflowRepository.updateMetadataIfVersion(id, version, ...)`, com checagem de `Workflow.version` | `src/services/workflowCollabService.ts:37` |
| `docs/RUNBOOK.md`, `docs/secrets-guide.md`, `src/lib/logger.ts` | Existem | checagem direta de arquivo |
| `npm audit` | 2 vulnerabilidades **altas** atuais: `react-router` (RSC Mode CSRF Bypass) — fix exige downgrade/breaking change (`react-router-dom@7.11.0`) | `npm audit` rodado nesta data |
| Dependências-alvo do upgrade major (ver §3) | `prisma@5.22`, `openai@6.47`, `ioredis@5.11`, `bullmq@5.80`, `lucide-react@0.563` | `package.json` |
| Suíte de testes | 18 arquivos em `__tests__/*.test.ts` (contagem de arquivos; não reexecutada nesta auditoria — ver relatório 2026-07-16 para a última execução real com 77/77 passando contra Postgres+Redis reais) | `find __tests__` |

### 🔴 Achado crítico desta consolidação — não estava em nenhum dos 4 relatórios anteriores

`.github/workflows/ci.yml` e `.github/workflows/deploy.yml`, **como commitados no HEAD atual de `main`** (`4e1af3f`), contêm marcadores de conflito de merge não resolvidos (`<<<<<<< HEAD` / `=======` / `>>>>>>> 175667d...`) — confirmado com `git show HEAD:.github/workflows/ci.yml`. Isso é YAML inválido: qualquer execução do GitHub Actions nesses workflows falha no parse.

Já existe uma correção **no working tree local, não commitada** (visível em `git status`/`git diff`) que remove os marcadores e resolve o conteúdo. Antes de qualquer outra ação neste repositório, alguém precisa revisar esse diff e commitar/push a correção — sem isso, CI e deploy estão quebrados em `main` agora. Não commitei automaticamente por ser uma mudança em workflow de CI/CD (ação sensível); avisar o usuário e pedir confirmação antes de commitar/push.

---

## 2. Riscos e débitos em aberto (deduplicados dos 4 relatórios)

| Item | Severidade | Origem | Status |
|---|---|---|---|
| Conflito de merge não resolvido em `ci.yml`/`deploy.yml` no HEAD de `main` | 🔴 Crítico | Achado nesta consolidação | Fix pronto, não commitado — ver §1 |
| `npm audit`: `react-router` CSRF bypass (RSC mode) | 🟠 Alto | Achado nesta consolidação | Fix disponível via `--force` (breaking change), avaliar antes de aplicar |
| Bundle `VoiceStudio` (~1 MB) e `AreaChart` (~320 KB) acima de 500 KB | 🟡 Médio | Relatórios 2026-07-16 e Enterprise Evolution | Não pago — code-splitting via `React.lazy` |
| RAG simulado em memória (sem `pgvector`/Qdrant) | 🟡 Médio | Enterprise Evolution | Não implementado |
| Ausência de Row-Level Security (RLS) nativa no Postgres — isolamento depende de `tenantId` no `where` de cada query | 🟡 Médio | Enterprise Evolution | Não implementado |
| Chamadas de IA acopladas diretamente ao Gemini (`ai.controller.ts`), sem gateway/fallback (LiteLLM ou similar) | 🟡 Médio | Enterprise Evolution | Não implementado |
| Observabilidade: sem Correlation ID, sem dashboards (Grafana/Loki), tracing só simulado no voice engine | 🟡 Médio | Enterprise Evolution | Parcial — `RUNBOOK.md` cobre operação manual |
| `console.*` remanescente em ~10 arquivos React do frontend | 🟢 Baixo | Enterprise Readiness | Não crítico, adiado deliberadamente |
| ~49 warnings de `no-explicit-any` (pré-existentes) | 🟢 Baixo | Enterprise Readiness / Stabilization Phase 2 | Um relatório (Stabilization Phase 2) afirma tê-los zerado; outro (Readiness, mesma data) lista os 49 como remanescentes — **contraditório, não reverificado nesta consolidação**. Rodar `npm run lint` antes de confiar em qualquer um dos dois. |
| SAST (Semgrep), DAST, SBOM (CycloneDX) | 🟢 Baixo | Enterprise Evolution | Não implementado |
| MFA / rotação automática de secrets / Vault | 🟢 Baixo | Enterprise Evolution | Não implementado |

> Nota sobre a contradição de lint acima: é exatamente o tipo de divergência que este documento único deve evitar daqui pra frente — dois relatórios da mesma leva de auditorias chegaram a conclusões opostas sobre o mesmo item porque cada agente rodou em isolamento e escreveu seu próprio arquivo. Antes de marcar qualquer item como resolvido neste documento, rode o comando de verificação e cole a saída ou o resultado objetivo, não a alegação do agente anterior.

---

## 3. Backlog de evolução (itens combinados do backlog do usuário + roadmap técnico dos relatórios)

### 3.1 Refatoração incremental (conforme os arquivos forem tocados)
- `pages/Landing.tsx`
- `store/useStudioStore.ts`
- `pages/Dashboard/Overview.tsx`

Sem quebra dedicada — dividir em módulos menores apenas quando uma mudança funcional já for tocar o arquivo, para não gerar diffs de puro refactor sem necessidade.

### 3.2 Upgrades major de dependências (com testes de regressão dedicados)
| Pacote | Atual | Alvo | Observação |
|---|---|---|---|
| `prisma` / `@prisma/client` | 5.22 | 7 | Duas major versions de salto — checar breaking changes de v6 e v7 (migrations, engine) antes de subir direto para 7 |
| `openai` | 6.47 | 7 | Checar mudanças de API do SDK |
| `ioredis` | 5.11 | 6 | Usado por rate limiter/BullMQ — testar filas e rate limit após upgrade |
| `bullmq` | 5.80 | 6 | Acoplado ao upgrade do `ioredis` acima — fazer juntos |
| `lucide-react` | 0.563 | 1.x | Mudança de esquema de versionamento (0.x → 1.x) da própria lib, checar renomeação de ícones |

Cada upgrade deve ir em PR isolado com a suíte de 77 testes (Postgres+Redis reais, não mocks — ver §1) rodando verde antes e depois.

### 3.3 Itens do roadmap técnico enterprise (não solicitados explicitamente pelo usuário, mantidos como contexto histórico)
Quick wins, curto/médio/longo prazo do `AUDIT_REPORT_ENTERPRISE_EVOLUTION.md` original — resumidos na tabela do §2 acima (bundle size, RLS, LiteLLM/gateway de IA, observabilidade, SAST/DAST/SBOM, Vault/MFA). Scorecard percentual (Arquitetura 82%, Segurança 61%, IA 34%, etc.) **não foi revalidado nesta consolidação** e não deve ser citado como número atual sem reexecutar a avaliação.

---

## 4. Histórico dos relatórios substituídos

Estes quatro relatórios foram lidos integralmente e consolidados nas seções acima; os originais foram removidos do repositório para eliminar a fonte de divergência. Resumo do que cada um cobria, para referência:

- **`AUDIT_REPORT_2026-07-16.md`** (2026-07-16) — Ciclo de integração dos agentes Jules (voice runtime, versionamento de Workflow, Agent/Knowledge management, docs enterprise). Corrigiu `npm ci` quebrado (lockfile) e o bug de `null` em `settingRepository.upsertSetting`. Identificou a race condition do `workflowCollabService` (hoje corrigida, ver §1) e o `.env` versionado (hoje corrigido, ver §1).
- **`AUDIT_REPORT_ENTERPRISE_EVOLUTION.md`** (sem data explícita) — Auditoria arquitetural ampla visando SaaS Enterprise multi-tenant: banco/ORM, performance, segurança, observabilidade, IA, multi-tenancy, DevOps, manutenibilidade. Scorecard de maturidade por categoria e roadmap executivo por horizonte de tempo — origem da tabela do §3.3.
- **`ENTERPRISE_READINESS_REPORT.md`** (2026-07-16, branch `worktree-production-ready-stabilization`) — Sessão de estabilização para produção: corrigiu crashes reais só visíveis rodando Docker de verdade (import estático de `vite` em produção, wildcard do Express 5, engine binary do Prisma no Alpine, Vitest capturando specs do Playwright), hardening OWASP (CSRF, rate limit de auth, CSP, cookies, secrets fora do bundle), TypeScript strict mode, logger central, refactor de `Developers.tsx`. Sinalizou que havia **múltiplas sessões de IA operando concorrentemente no mesmo repositório** durante essa auditoria (incluindo outro Claude Code) — relevante para entender por que os 4 relatórios divergem entre si.
- **`docs/EXECUTIVE_STABILIZATION_REPORT.md`** (Fase 2) — Relatório mais curto e mais otimista: matriz de testes de CI (20.x/22.x), Workload Identity Federation no GCP, guia de secrets, remoção de `console.log` residual, e a afirmação (não reverificada, ver §2) de que os 49 warnings de `any` foram zerados.

---

## Changelog deste documento

- **2026-08-02** — Consolidação inicial: 4 relatórios sobrepostos substituídos por este arquivo único. Verificado estado atual do código (ver §1) e encontrado o achado crítico dos marcadores de merge conflict não resolvidos em `ci.yml`/`deploy.yml` no HEAD de `main`.
