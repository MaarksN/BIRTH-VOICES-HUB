# Auditoria de Governanca, Privacidade e Compliance

STATUS: FAIL para producao

## Governanca tecnica

| Item | Status | Evidencia |
|---|---|---|
| Branch protection | BLOCKED | Nao validado sem acesso remoto/politicas GitHub. |
| CI bloqueante | FAIL | `.github/workflows` ausente. |
| Revisao obrigatoria PR | BLOCKED | Nao validado. |
| Rollback documentado | FAIL | README nao documenta rollback. |
| Runbook/incidente | FAIL | Nao ha runbook. |
| RPO/RTO | FAIL | Nao documentado. |
| Rotacao de credenciais | FAIL | Nao documentado. |

## Privacidade/LGPD

Riscos:

- Plataforma armazena transcricoes, nomes/contatos, campos extraidos e dados potencialmente sensiveis de saude/RH.
- Nao ha consentimento com timestamp/versao.
- Nao ha politica de retencao.
- Nao ha exclusao real de conta/dados do usuario.
- Nao ha exportacao/portabilidade completa; existe CSV de sessoes em `pages/Dashboard/Results.tsx:97`.
- Nao ha segregacao formal entre ambiente de teste e producao.
- Nao ha trilha de auditoria imutavel.

## Evidencias

- `pages/Dashboard/Organization.tsx:148-155`: tela informa que eventos reais de auditoria ainda nao estao habilitados.
- `server.ts:1070`: cria sessoes com transcricao/resumo.
- `server.ts:134-138`: grava todo o banco JSON local.
- `server.ts:1045`: ha delete de agente, mas nao delete/export de conta completa.

## Decisao

FAIL para prontidao de producao, especialmente se houver dados de saude, RH, candidatos, pacientes ou clientes reais.
