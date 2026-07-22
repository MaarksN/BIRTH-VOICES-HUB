# Auditoria Técnica da Plataforma - Birth Voices Hub (Evolução Enterprise)

## Visão Geral
Auditoria arquitetural completa visando a transformação da plataforma em um ecossistema SaaS Enterprise (SDR/Closer/Agent AI Native), robusto, escalável e multi-tenant.

## 1. Banco de Dados e ORM (PostgreSQL + Prisma)
A modelagem atual adota PostgreSQL via Prisma, com uma abordagem Row-Level Multi-Tenancy (`tenantId` na maioria das tabelas).
* **Índices Ausentes:** Foram mapeados índices básicos para `tenantId`, mas a estrutura de chaves compostas (ex: Settings) necessita otimização. Não há índices vetoriais (pgvector) configurados para a engine RAG.
* **Queries N+1 e Include:** Alguns services fazem uso excessivo de consultas lineares ou joins densos no Prisma. Requer auditoria fina de `include`.
* **Plano de Execução:** Ausente (EXPLAIN ANALYZE não aplicado no Prisma em logs).
* **Estratégia de Migrations:** Gerenciada, mas sem schema versioning explícito cross-tenant em isolamento lógico (RLS).
* **Soft Delete:** A maioria dos modelos (User, Tenant, Workflow) possui `deletedAt`, mas não há validação via extension/middleware global no Prisma; a deleção lógica depende do desenvolvedor não esquecer de filtrar `deletedAt: null`.
* **Pool de Conexões:** Utiliza o pool padrão do Prisma. Sem PgBouncer configurado explicitamente no CI/CD.
* **Backup/Restore, Particionamento e Integridade:** Sem particionamento nativo de logs (CallLog/Metric) e a estratégia de Disaster Recovery ainda está pendente de definição via IaC.

## 2. Performance
* **Latência (P50/P95/P99) & Tempo Médio:** Não instrumentado adequadamente (embora o OpenTelemetry exista na camada de voz, as APIs não possuem métricas RED completas expostas).
* **Gargalos CPU/IO:** O processamento local de áudio e RAG (simulado na memória) gera event loop blocking (CPU). O IO de chamadas API aos LLMs necessita ser enfileirado.
* **Uso de Memória:** O node local retém RAG embeddings simulados, indicando um risco grande de vazamento de memória.
* **Bundle Size:** O frontend (Vite/React) produz chunks maiores que 1MB (`VoiceStudio`). Code-splitting e `React.lazy` (Dynamic Imports) são mandatórios.
* **Cache:** O uso de HTTP Caching é escasso. Hit Rate de Redis não instrumentado, Redis é utilizado essencialmente como `Rate Limiter` e `BullMQ`.

## 3. Segurança
* **Autenticação:** Baseada em JWT + Refresh Tokens (via cookies HttpOnly). Mecanismo bom, mas sem rotação automática de Secrets ou isolamento no Vault. Proteção CSRF implementada.
* **Análises & Scanner:** Dependabot/npm audit existem, mas falha em SAST (Semgrep), DAST e SBOM (CycloneDX).
* **Proteções:** Helmet (CSP), CORS restritivo e Rate Limit estão ativos. Proteção contra SSRF e IDOR carece de checagens finas em propriedades que não `tenantId`.
* **OWASP & Auditoria:** JWT seguro, porém sem MFA/Better Auth robusto e logs de trilha de auditoria (`AuditLog`) são mantidos em banco relacional sem WORM (Write Once Read Many).

## 4. Observabilidade
* **Situação Atual:** OpenTelemetry SDK configurado apenas para simulação (Voice Engine).
* **Faltantes Enterprise:**
  - Logs estruturados (`logger.ts` não exporta JSON rígido para Loki).
  - Correlation ID e Request ID ausentes em transações encadeadas HTTP.
  - Tracing Distribuído completo não instrumentado nas filas.
  - Dashboards Grafana, Alertmanager, SLO/SLA, e Error Budgets inexistentes.
  - Health Checks limitados à conectividade básica do Redis/Banco, sem Synthetic Monitoring.

## 5. Inteligência Artificial (NexusOne Native AI)
O código revela chamadas diretas às APIs do Gemini (`ai.controller.ts`), o que não é escalável nem polimórfico.
* **Pontos Críticos e Faltantes:**
  - Necessário migrar para `LiteLLM Gateway` e gerenciar Fallback entre modelos.
  - Prompt Versioning, Prompt Registry e Model Registry inexistentes.
  - Guardrails e Token Tracking por Tenant não implementados (risco financeiro/abuso).
  - RAG Evaluation, Observabilidade de IA (ex: Langfuse) ausentes.
  - RAG atual é simulado em memória; carece de `pgvector` ou Qdrant.
  - Faltam abstrações robustas: `LangGraph`, Memory Layer (Context Window Management) e MCP (Model Context Protocol).
  - Integração CRM (SDR/Closer) via Agentes IA colaborativos ainda embrionária.

## 6. Multi-tenancy
* **Isolamento de Tenants:** Atualmente implementado via `tenantId` nas queries (`requireTenant` extrai do JWT).
* **Falhas/Riscos:** Não há Row-Level Security (RLS) nativo no Postgres configurado, abrindo brecha para Cross Tenant Leakage caso o desenvolvedor esqueça de injetar `tenantId`.
* **Maturidade:** Falta Billing por Tenant, Quotas, Limites e Feature Flags segmentadas.

## 7. DevOps
* **Automação:** GitHub Actions para CI (testes) e CD básico (Cloud Run).
* **Débito:** Build Cache não otimizado, Docker Layers ineficientes. Faltam práticas Enterprise: Helm/Kubernetes, ArgoCD, Blue/Green, Canary, Rollback automático, Disaster Recovery e Chaos Engineering.

## 8. Código e Manutenibilidade
* **Qualidade:** ESLint e Type checking presentes. Porém, `ai.controller.ts` é um "God Class" acoplado a regras de negócio (`Clean Architecture Violation`).
* **Débito:** Uso excessivo de tipos genéricos em middlewares e testes. Mocks manuais desatualizados no `vitest.setup.ts` geram atritos. Faltam análises de Acoplamento, Coesão e Complexidade Ciclomática integradas ao CI (ex: SonarQube).

## 9. Score Enterprise NexusOne

| Categoria         | Score | Justificativa Breve |
| :---------------- | :---: | :------------------ |
| **Arquitetura**   | 82%   | Separação Clean Architecture visível, Prisma robusto, mas falta RLS e padronização. |
| **Documentação**  | 78%   | Readme, ADRs e docs presentes, porém desatualizadas com o estado da stack real. |
| **Performance**   | 74%   | Otimização pendente no Bundle Size do Vite e N+1 no Prisma. |
| **Escalabilidade**| 71%   | Estrutura containerizada (Cloud Run), mas RAG e áudio vazam memória local. |
| **Testes**        | 69%   | Cobertura decente, mas suscetível a falhas de DB não mocado no pipeline. |
| **Multi-tenancy** | 65%   | Depende de `where` no Prisma. Ausência de RLS nativo ou schemas dedicados. |
| **Segurança**     | 61%   | CSP e JWT ok, mas falta SAST, Vault, Rotação de Secrets e MFA. |
| **DevOps**        | 57%   | CI/CD básico. Sem Helm, Kubernetes, ArgoCD ou tolerância a falhas. |
| **Observabilidade**| 38%   | Telemetria isolada, faltam Correlation IDs, Prometheus/Grafana/Loki e SLOs. |
| **IA**            | 34%   | Chamadas REST acopladas (Gemini). Sem LiteLLM, RAG vetorial real, Guardrails ou Prompt Registry. |
| **Nota Geral**    | **62.9%** | Fundação razoável, mas exige forte refatoração rumo a padrões Enterprise (P0/P1). |

---

## 10. Roadmap Executivo de Evolução

### Quick Wins (1–3 dias)
| Iniciativa | Complexidade | Impacto | Esforço | ROI | Prioridade | Risco | Critério de Aceite |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Ativar Dynamic Imports no React** | Baixa | Alto | Baixo | Alto | P0 | Baixo | Chunk `VoiceStudio` < 500KB no build. |
| **Middleware de Global Soft Delete** | Média | Alto | Baixo | Alto | P1 | Médio | Queries do Prisma filtram implicitamente `deletedAt: null`. |
| **Correlation ID nos Logs** | Baixa | Médio | Baixo | Alto | P1 | Baixo | Toda requisição HTTP injeta um UUID propagado nos logs. |

### Curto Prazo (1–2 semanas)
| Iniciativa | Complexidade | Impacto | Esforço | ROI | Prioridade | Risco | Critério de Aceite |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Integração LiteLLM + Fallback** | Média | Alto | Médio | Alto | P0 | Baixo | Chamadas GenAI centralizadas e agnósticas (OpenAI/Anthropic/Gemini). |
| **Infra de RAG (pgvector)** | Alta | Alto | Médio | Alto | P0 | Médio | Embeddings via pgvector no PostgreSQL ao invés da memória Node.js. |
| **SAST & Lint no GitHub Actions** | Baixa | Alto | Baixo | Médio | P1 | Baixo | Bloqueio de W/Errors via Semgrep no PR. |

### Médio Prazo (1–2 meses)
| Iniciativa | Complexidade | Impacto | Esforço | ROI | Prioridade | Risco | Critério de Aceite |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Better Auth / Vault Integration** | Alta | Alto | Alto | Médio | P1 | Alto | WORM, MFA, SSO habilitados e Secrets no GCP Secret Manager/Vault. |
| **Roteamento de IA / LangGraph** | Alta | Alto | Alto | Alto | P0 | Alto | Multi-Agentes colaborando via Roteador. Memória contextual perene. |
| **Observabilidade Plena (Grafana/Loki)** | Média | Alto | Médio | Alto | P2 | Baixo | Dashboards de SLI/SLO e transações traceadas (Jaeger/Otel). |

### Longo Prazo (3–6 meses)
| Iniciativa | Complexidade | Impacto | Esforço | ROI | Prioridade | Risco | Critério de Aceite |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Migração Kubernetes / ArgoCD** | Alta | Alto | Alto | Médio | P2 | Alto | IaC completo. Deploys Blue/Green configurados. |
| **PostgreSQL RLS (Row-Level Security)** | Alta | Crítico | Alto | Alto | P1 | Crítico | Multi-tenancy nativo do DB garantido; zero chance de vazamento cross-tenant. |
| **CRM IA Completo (SDR/Closer)** | Extrema | Transformador | Extremo | Altíssimo | P0 | Alto | ICP Match, Scoring e Automação integrados com fontes externas (LinkedIn/Receita). |
