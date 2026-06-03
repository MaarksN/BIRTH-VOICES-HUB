# Auditoria de API

STATUS: PARTIAL

## Endpoints mapeados

`rg -n "app\.(get|post|put|patch|delete)" server.ts` identificou:

| Metodo | Caminho | Auth | Status |
|---|---|---|---|
| GET | `/api/status` | Opcional por bearer | PASS |
| POST | `/api/auth/register` | Publico | PASS |
| POST | `/api/auth/login` | Publico | PASS |
| POST | `/api/auth/logout` | Bearer | PASS |
| GET | `/api/me` | Bearer | PASS |
| PATCH | `/api/me` | Bearer | PASS |
| GET/POST/PUT/DELETE | `/api/agents` e `/api/agents/:id` | Bearer | PASS |
| GET/POST | `/api/sessions` | Bearer | PASS |
| POST | `/api/sessions/analyze-and-save` | Bearer | PASS |
| GET/POST | `/api/telephony/calls` | Bearer | PARTIAL |
| POST | `/api/twilio/voice/:callId` | Publico | PARTIAL/RISK |
| POST | `/api/twilio/voice/:callId/answer` | Publico | PARTIAL/RISK |
| POST | `/api/twilio/status/:callId` | Publico | PARTIAL/RISK |
| GET/PATCH | `/api/integrations` | Bearer | PASS |
| GET/POST | `/api/integrations/deliveries` | Bearer | PASS/PARTIAL |
| POST | `/api/integrations/test-webhook` | Bearer | PARTIAL |
| POST | `/api/chat` | Bearer | BLOCKED sem Gemini |

## Validacoes dinamicas

PASS:

- `scripts/smoke-test.mjs`: status, cadastro, `/api/me`, criar agente, listar agente, criar sessao, listar sessao, fallback de integracao.
- Teste API customizado: `/api/me` sem token retorna 401; dois usuarios isolados; cross-tenant update/delete/retry retorna 404.

BLOCKED:

- Gemini real, Twilio real, webhook externo real e staging nao foram validados por falta de credenciais/URLs.

## Riscos de contrato

- Nao ha OpenAPI/Swagger.
- Nao ha testes unitarios/contrato versionados no repo.
- Handler global retorna sempre `400` em erro generico (`server.ts:1487`), o que pode mascarar 500 reais.
- `express.json({ limit: "2mb" })` existe (`server.ts:871`), mas nao ha rate limiting.
- Webhook aceita `http://` alem de `https://` (`server.ts:1376`), util localmente, mas inseguro para producao.
- Twilio webhooks publicos nao validam assinatura Twilio; dependem de `callId` nao adivinhavel.

## Decisao

API local esta funcional para fluxos principais. Producao exige OpenAPI, testes automatizados, status codes mais precisos, rate limiting, validacao de assinaturas Twilio, hardening de webhooks e observabilidade.
