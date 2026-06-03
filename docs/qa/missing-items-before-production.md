# Lacunas Antes de Producao

STATUS: NO-GO

## Estrutura

| Lacuna | Evidencia | Prioridade | Criterio de aceite |
|---|---|---|---|
| CI/CD ausente | Sem `.github/workflows`. | P1 | Pipeline bloqueante com install, lint, tests, build, audit, smoke. |
| Deploy reproduzivel ausente | Sem Dockerfile/IaC/staging. | P1 | Staging igual a producao com smoke aprovado. |
| Runbook/rollback ausente | README nao cobre operacao. | P1 | Runbook com rollback, incidentes, RPO/RTO. |

## Funcionalidades

| Lacuna | Evidencia | Prioridade | Criterio de aceite |
|---|---|---|---|
| Gemini real nao validado | `GEMINI_API_KEY` ausente. | P2 | Teste com chave sandbox e logs redigidos. |
| Twilio real nao validado | credenciais/public URL ausentes. | P2 | Chamada real sandbox com callbacks assinados. |
| Webhook real nao validado | endpoint externo ausente. | P2 | Entrega real para sandbox HTTPS com assinatura verificada. |
| Billing/metering ausente | Billing UI declara sem provedor. | P2 | Provedor real ou remover escopo de producao. |

## Banco de dados

| Lacuna | Evidencia | Prioridade | Criterio de aceite |
|---|---|---|---|
| Persistencia JSON local | `server.ts:76-138`. | P1 | Banco gerenciado ou aceitacao formal de escopo local. |
| Backup/restore nao testado | Sem script/docs. | P1 | Backup e restore executados com evidencia. |
| Migrations ausentes | Sem SQL/schema. | P1 | Migrations versionadas quando banco real existir. |

## Seguranca

| Lacuna | Evidencia | Prioridade | Criterio de aceite |
|---|---|---|---|
| Headers ausentes | HEAD local sem CSP/HSTS/XFO/XCTO. | P1 | Helmet/headers verificados por curl. |
| Rate limiting ausente | Sem dependencia/config. | P1 | Limites em auth/API/webhooks. |
| Tokens inseguros | `localStorage` e JSON. | P1 | Cookies seguros ou storage equivalente, tokens protegidos em repouso. |
| Twilio sem assinatura | endpoints publicos `/api/twilio/*`. | P1 | Validacao `X-Twilio-Signature`. |
| SSRF webhook | URL configuravel aceita HTTP. | P1 | HTTPS obrigatorio em prod e bloqueio de rede privada. |

## Testes

| Lacuna | Evidencia | Prioridade | Criterio de aceite |
|---|---|---|---|
| Lint ausente | `npm run lint` missing script. | P1 | Lint passa no CI. |
| Unit/integration ausentes | `npm run test` missing script; 0 arquivos teste. | P1 | Cobertura core definida e aprovada. |
| E2E versionado ausente | Playwright nao esta no projeto. | P1 | E2E em CI para fluxos criticos. |

## Operacao e compliance

| Lacuna | Evidencia | Prioridade | Criterio de aceite |
|---|---|---|---|
| Observabilidade ausente | sem tracing/logs estruturados/alertas. | P2 | Logs com request/user/tenant id e alertas. |
| LGPD incompleta | sem consentimento/delete/retencao. | P1 | Politicas e endpoints implementados/testados. |
| Auditoria administrativa ausente | Organization informa eventos nao habilitados. | P2 | Audit log imutavel de acoes criticas. |
