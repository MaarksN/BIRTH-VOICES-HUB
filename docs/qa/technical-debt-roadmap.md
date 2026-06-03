# Roadmap de divida tecnica

STATUS: READY

## Release readiness 1 - Bloqueadores de producao

1. Migrar persistencia para banco com migrations, backup e restore.
2. Criar CI com `npm ci`, lint, format check, typecheck, unit/integration tests, build, audit e smoke.
3. Implementar testes unitarios/integracao para auth, agents, sessions, isolation e webhooks.
4. Validar assinatura Twilio.
5. Trocar armazenamento de sessao para cookie HttpOnly ou alternativa equivalente.
6. Adicionar rate limiting, Helmet/CSP e politica de erros.
7. Criar staging e executar smoke real.
8. Implementar backup/restore e rollback documentado.

## Release readiness 2 - Produto e operacao controlada

1. Definir modelo real de organizacao, membros, convites e RBAC.
2. Conectar ou remover billing.
3. Conectar ou remover cards de integracoes de AgentForm.
4. Hardening de webhook: SSRF protection, timeout, fila, retry, idempotencia.
5. Observabilidade minima: logs estruturados, request id, metricas, alertas.
6. E2E deterministico do playground e telefonia.

## Release readiness 3 - Maturidade

1. OpenAPI e contratos.
2. SBOM e politica de licencas.
3. ADRs, CODEOWNERS, SECURITY.md, CONTRIBUTING.md.
4. Testes de carga e concorrencia.
5. LGPD: retencao, exclusao, portabilidade, consentimento e auditoria.

