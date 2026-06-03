# Roadmap de Divida Tecnica

STATUS: Plano recomendado

## Semana 1 - Bloqueadores de release

1. Criar CI com `npm ci`, typecheck, build, smoke, audit e scripts faltantes.
2. Adicionar `lint`, `test`, `test:coverage`, `test:integration`.
3. Implementar headers de seguranca, rate limiting e sanitizacao de erros.
4. Definir staging e rodar smoke real.
5. Documentar rollback, backup e runbook minimo.

## Semanas 2-3 - Seguranca e dados

1. Migrar tokens para cookie HttpOnly/SameSite/Secure ou estrategia equivalente.
2. Hash/criptografar tokens e webhook secrets em repouso.
3. Validar assinatura Twilio nos callbacks.
4. Restringir webhooks contra SSRF e exigir HTTPS em producao.
5. Definir banco persistente com migrations e backup/restore testado.

## Mes 1 - Produto operacional

1. Implementar tenant formal, roles e auditoria administrativa.
2. Criar testes E2E versionados para cadastro, login, agente, playground, resultados e logout.
3. Implementar observabilidade: logs estruturados, `request_id`, metricas e alertas.
4. Criar politica LGPD: consentimento, retencao, exclusao e exportacao.
5. Se billing estiver no escopo, implementar provedor real, webhooks assinados e idempotencia.

## Criterios de saida do NO-GO

- P1 zerados ou mitigados formalmente.
- E2E e smoke staging aprovados.
- Lint/test/build/audit/CI aprovados.
- Backup/restore testado.
- Seguranca minima web/API aplicada.
