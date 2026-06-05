# Privacidade Operacional

## Controles implementados

- Consentimento registrado no cadastro com timestamp, versão (`PRIVACY_TERMS_VERSION`) e origem.
- Retenção configurável por `DATA_RETENTION_DAYS`; o valor fica exposto em `/api/privacy/policy` e `/api/health`.
- Exportação da organização em `GET /api/privacy/export`.
- Exclusão em `POST /api/privacy/delete` com `confirmation=DELETE`.
- Audit log encadeado por hash para ações críticas.

## Ações auditadas

- `account_register`
- `login`
- `logout`
- `privacy_export`
- `account_delete`
- `webhook_update`
- `integration_delivery_retry`
- `agent_create`
- `agent_update`
- `agent_delete`
- `organization_update`

## Política de exclusão

A exclusão remove dados operacionais vinculados ao tenant: agentes, sessões, integrações, chamadas e entregas. O usuário e a organização são anonimizados para manter integridade mínima de auditoria.

## Sanitização

Metadados de auditoria redigem chaves sensíveis como senha, token, segredo, autorização e transcrição. Logs HTTP não incluem corpo de requisição.
