# Registro de divida tecnica

STATUS: READY

## Matriz consolidada

| ID | Area | Problema | Prioridade | Impacto | Esforco | Bloqueia producao | Acao recomendada |
|---|---|---|---|---|---|---|---|
| TD-001 | Banco | JSON local sem transacao/migrations/backup | P1 | perda/corrupcao de dados | L | SIM | Migrar para banco real com migrations e backup. |
| TD-002 | QA | Sem lint/format/test scripts | P1 | gates obrigatorios ausentes | M | SIM | Adicionar ESLint/Prettier/Vitest. |
| TD-003 | QA | Sem testes unitarios/integracao formais | P1 | regressao invisivel | L | SIM | Cobrir auth, agents, sessions, webhooks. |
| TD-004 | Seguranca | Twilio callbacks sem assinatura | P1 | manipulacao de chamada/status | M | SIM | Validar `X-Twilio-Signature`. |
| TD-005 | Auth | Token em localStorage | P1 | sequestro em XSS | M | SIM | Migrar para cookie HttpOnly ou hardening equivalente. |
| TD-006 | Seguranca | Sem rate limit/headers/CSP | P1 | brute force/XSS/clickjacking | M | SIM | Adicionar helmet, CSP e rate limit. |
| TD-007 | Operacao | Sem backup/restore/rollback | P1 | perda de dados e indisponibilidade | L | SIM | Definir e testar runbooks. |
| TD-008 | Deploy | Sem CI/CD/staging smoke | P1 | release nao reproduzivel | M | SIM | Criar pipeline e ambiente staging. |
| TD-009 | Webhook | SSRF/timeout/idempotencia fracos | P1 | abuso de rede e duplicidade | M | SIM | Validar URLs, timeout, fila e idempotencia. |
| TD-010 | Produto | Billing UI-only | P2 | expectativa falsa de faturamento | M | NAO | Integrar gateway ou ocultar feature. |
| TD-011 | Produto/Authz | Times/convites/RBAC ausentes | P2 | organizacao nao e multiusuario real | L | NAO | Modelar membros, papeis e convites. |
| TD-012 | Produto | Cards de integracao sem acao | P2 | UX enganosa | S | NAO | Conectar ou remover cards. |
| TD-013 | Frontend | Tailwind CDN/importmap em producao | P2 | performance e CSP fracos | M | NAO | Buildar Tailwind no pipeline. |
| TD-014 | Codigo | `any` e modulos grandes | P2 | manutencao dificil | L | NAO | Modularizar e tipar contratos. |
| TD-015 | Observabilidade | Sem logs estruturados/metricas/alertas | P2 | incidente invisivel | M | NAO | Adicionar logger, metricas e dashboards. |
| TD-016 | Dependencias | Scripts de instalacao pendentes | P3 | supply chain governance | S | NAO | Revisar/registrar aprovacao de scripts. |
| TD-017 | Admin | Admin sem RBAC | P2 | permissao confusa | M | NAO | Criar roles reais ou renomear escopo. |

## Detalhamento

### TD-001

Titulo: Persistencia JSON local sem garantias produtivas

Area: Banco de dados

Prioridade: P1 - ALTO

Status: OPEN

Descricao: A aplicacao usa `data/birth-voices.json` como banco.

Evidencia: `server.ts` linhas 76-138.

Arquivo(s): `server.ts`

Linha(s): 76-138

Impacto tecnico: sem transacoes, indices, migrations, backup e restore.

Impacto para usuario: risco de perda ou corrupcao de dados.

Impacto para negocio: bloqueia operacao confiavel.

Risco: alto.

Causa provavel: prototipo/local-first.

Solucao recomendada: Postgres/Supabase/SQLite gerenciado com migrations, backup e restore testado.

Alternativas: manter JSON apenas para modo local explicitamente nao produtivo.

Esforco estimado: L

Dependencias: escolha de banco e hospedagem.

Criterio de aceite: migrations do zero, backup e restore aprovados em staging.

Testes necessarios: unitarios, integracao DB, concorrencia, restore.

Bloqueia producao: SIM

Responsavel sugerido: Backend/DevOps

Sprint ou milestone sugerida: Release readiness 1

### TD-002

Titulo: Gates de lint/format/test ausentes

Area: QA

Prioridade: P1 - ALTO

Status: OPEN

Descricao: `npm run lint`, `npm run format:check` e `npm test` nao existem.

Evidencia: comandos retornaram Missing script.

Arquivo(s): `package.json`

Linha(s): scripts

Impacto tecnico: regressao e inconsistencia nao sao bloqueadas.

Impacto para usuario: bugs chegam ao produto.

Impacto para negocio: release sem qualidade verificavel.

Risco: alto.

Causa provavel: projeto ainda em fase inicial.

Solucao recomendada: adicionar ESLint, Prettier, Vitest e scripts obrigatorios.

Alternativas: Biome como ferramenta unica.

Esforco estimado: M

Dependencias: padrao de estilo.

Criterio de aceite: scripts passam local e em CI.

Testes necessarios: CI completo.

Bloqueia producao: SIM

Responsavel sugerido: Fullstack/QA

Sprint ou milestone sugerida: Release readiness 1

### TD-003

Titulo: Ausencia de testes unitarios e integracao

Area: Testes

Prioridade: P1 - ALTO

Status: OPEN

Descricao: So existe smoke customizado; nao ha suites por camada.

Evidencia: diretorios `tests/` e `e2e/` ausentes.

Arquivo(s): repositorio

Linha(s): N/A

Impacto tecnico: regras de auth, storage e integracoes podem quebrar sem alerta.

Impacto para usuario: instabilidade em fluxos criticos.

Impacto para negocio: maior custo de manutencao.

Risco: alto.

Causa provavel: foco em entrega funcional inicial.

Solucao recomendada: cobrir auth, agents, sessions, webhooks, isolation e frontend.

Alternativas: expandir smoke inicialmente.

Esforco estimado: L

Dependencias: framework de testes.

Criterio de aceite: cobertura dos fluxos criticos e negativos.

Testes necessarios: unit, integration, e2e.

Bloqueia producao: SIM

Responsavel sugerido: QA/Fullstack

Sprint ou milestone sugerida: Release readiness 1

### TD-004

Titulo: Callbacks Twilio sem assinatura

Area: Seguranca/API

Prioridade: P1 - ALTO

Status: OPEN

Descricao: Endpoints Twilio aceitam chamadas publicas sem validar origem.

Evidencia: `/api/twilio/voice/:callId`, `/answer` e `/status` nao verificam `X-Twilio-Signature`.

Arquivo(s): `server.ts`

Linha(s): 1190-1310

Impacto tecnico: status/transcricoes podem ser manipulados.

Impacto para usuario: sessoes falsas ou alteradas.

Impacto para negocio: risco de fraude e dados incorretos.

Risco: alto.

Causa provavel: integracao direta inicial.

Solucao recomendada: validar assinatura Twilio com auth token e URL canonica.

Alternativas: proxy autenticado dedicado.

Esforco estimado: M

Dependencias: `PUBLIC_BASE_URL` estavel.

Criterio de aceite: callbacks invalidos retornam 403 e testes passam.

Testes necessarios: positivos/negativos de assinatura.

Bloqueia producao: SIM

Responsavel sugerido: Backend/Security

Sprint ou milestone sugerida: Release readiness 1

### TD-005

Titulo: Sessao bearer em localStorage

Area: Autenticacao

Prioridade: P1 - ALTO

Status: OPEN

Descricao: Token fica persistido em `localStorage`.

Evidencia: `lib/auth.ts` e `lib/api.ts`.

Arquivo(s): `lib/auth.ts`, `lib/api.ts`

Linha(s): N/A

Impacto tecnico: XSS compromete token.

Impacto para usuario: sequestro de sessao.

Impacto para negocio: incidente de seguranca.

Risco: alto.

Causa provavel: SPA simples.

Solucao recomendada: cookie HttpOnly/SameSite/Secure, CSRF conforme necessario, refresh/revocation.

Alternativas: manter bearer somente em memoria com CSP forte.

Esforco estimado: M

Dependencias: estrategia de auth.

Criterio de aceite: token nao acessivel por JS e logout/revogacao testados.

Testes necessarios: auth e security tests.

Bloqueia producao: SIM

Responsavel sugerido: Backend/Frontend

Sprint ou milestone sugerida: Release readiness 1

Demais itens da matriz seguem o mesmo criterio de aceite indicado na tabela consolidada.

