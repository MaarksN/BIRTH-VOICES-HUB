# Auditoria de API

STATUS: PARTIAL

Endpoints mapeados:

| Metodo | Caminho | Auth | Status |
|---|---|---|---|
| GET | `/api/status` | opcional | PASS |
| POST | `/api/auth/register` | nao | PASS |
| POST | `/api/auth/login` | nao | PASS |
| POST | `/api/auth/logout` | sim | PARTIAL |
| GET | `/api/me` | sim | PASS |
| PATCH | `/api/me` | sim | PASS |
| GET | `/api/agents` | sim | PASS |
| POST | `/api/agents` | sim | PASS |
| PUT | `/api/agents/:id` | sim | PASS |
| DELETE | `/api/agents/:id` | sim | PASS |
| GET | `/api/sessions` | sim | PASS |
| POST | `/api/sessions` | sim | PASS |
| POST | `/api/sessions/analyze-and-save` | sim | PASS local sem Gemini |
| GET | `/api/telephony/calls` | sim | PARTIAL |
| POST | `/api/telephony/calls` | sim | BLOCKED sem Twilio |
| POST | `/api/twilio/voice/:callId` | nao | FAIL seguranca |
| POST | `/api/twilio/voice/:callId/answer` | nao | FAIL seguranca |
| POST | `/api/twilio/status/:callId` | nao | FAIL seguranca |
| GET | `/api/integrations` | sim | PASS |
| GET | `/api/integrations/deliveries` | sim | PASS |
| POST | `/api/integrations/deliveries/:id/retry` | sim | PARTIAL |
| PATCH | `/api/integrations` | sim | PARTIAL |
| POST | `/api/integrations/test-webhook` | sim | PARTIAL |
| POST | `/api/chat` | sim | BACKEND ONLY/BLOCKED sem Gemini |

Validacoes positivas:

- Smoke validou `/api/status`, cadastro, `/api/me`, CRUD basico de agente, criacao/listagem de sessao e fallback de integracao.
- Isolamento de agentes por usuario validado com dois usuarios.
- Payload JSON limitado a 2 MB.
- Erros de autenticacao retornam 401.

Lacunas:

- Nao ha rate limiting.
- Nao ha schemas centralizados com Zod/Yup/JSON Schema.
- Nao ha OpenAPI/contratos.
- Nao ha testes automatizados negativos formais.
- Nao ha paginacao server-side para sessoes/agentes.
- Webhook de saida aceita URL arbitraria `http://` ou `https://`, sem allowlist, bloqueio de IP privado, timeout ou limite de resposta forte.
- Twilio callbacks nao validam assinatura.
- Tratador global retorna status 400 para muitos erros internos.

Decisao da fase: PARTIAL. APIs locais principais funcionam, mas seguranca e contratos nao atendem producao.

