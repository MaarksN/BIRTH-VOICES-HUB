# Auditoria de infraestrutura, CI/CD e deploy

STATUS: FAIL

Local:

- `npm ci` passou com Node runtime e PATH corrigido.
- `npm run build` passou.
- `npm run smoke` passou.
- Servidor de producao local `dist/server.cjs` iniciou em porta temporaria.

Ausencias:

- Sem Dockerfile.
- Sem docker-compose/compose.
- Sem `.github/workflows`.
- Sem pipeline de lint/typecheck/test/build/audit.
- Sem deploy script.
- Sem staging URL.
- Sem production URL.
- Sem healthcheck dedicado alem de `/api/status`.
- Sem readiness/liveness checks.
- Sem migration step.
- Sem secrets manager documentado.
- Sem rollback de deploy.
- Sem backup/restore.

Tabela de ambientes:

| Item | Local | Teste | Staging | Producao |
|---|---|---|---|---|
| Runtime | Node validado via Codex | BLOCKED | BLOCKED | BLOCKED |
| Banco | JSON local | JSON temporario | BLOCKED | BLOCKED |
| Variaveis | `.env.example` | parciais | BLOCKED | BLOCKED |
| Storage | arquivo local | temp dir | BLOCKED | BLOCKED |
| HTTPS | NOT APPLICABLE local | BLOCKED | BLOCKED | BLOCKED |
| Backup | FAIL | FAIL | BLOCKED | BLOCKED |
| Restore | FAIL | FAIL | BLOCKED | BLOCKED |
| Monitoramento | FAIL | FAIL | BLOCKED | BLOCKED |

Decisao: FAIL para producao.

