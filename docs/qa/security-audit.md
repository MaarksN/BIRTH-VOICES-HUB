# Auditoria de seguranca

STATUS: FAIL

Achados positivos:

- Nenhum segredo real encontrado no repositorio; apenas `.env.example`.
- Senhas usam PBKDF2 SHA-512 com salt.
- Tokens sao aleatorios via `crypto.randomBytes(32)`.
- Comparacao de senha usa `timingSafeEqual`.
- Webhook de saida suporta assinatura HMAC SHA-256.
- Payload JSON limitado a 2 MB.
- `npm audit` reportou 0 vulnerabilidades conhecidas.

Riscos bloqueadores:

| Item | Status | Risco | Evidencia |
|---|---|---|---|
| Twilio callback signature | FAIL | Chamadas/status podem ser manipulados se `callId` vazar/adivinhado | Endpoints `/api/twilio/*` sem validacao `X-Twilio-Signature`. |
| Token no `localStorage` | FAIL | XSS vira sequestro de sessao | `lib/auth.ts` e `lib/api.ts`. |
| Rate limiting | FAIL | brute force e abuso de API | Sem `express-rate-limit` ou equivalente. |
| HTTP hardening | FAIL | falta CSP, frame options, nosniff, referrer policy | Sem `helmet`; Tailwind CDN em `index.html`. |
| Webhook SSRF | FAIL | usuario autenticado pode acionar fetch server-side para URLs arbitrarias | `PATCH /api/integrations` aceita `http://` e `https://`; `sendWebhook` usa `fetch(url)`. |
| Timeout/idempotencia webhook | FAIL | recursos presos ou entregas duplicadas | Sem `AbortController`, backoff, idempotency key ou fila. |
| Admin/RBAC | FAIL | rota admin sem permissao diferenciada | Qualquer usuario autenticado acessa `/dashboard/admin`. |
| Backup/restore | FAIL | perda de dados | Ausente. |

Riscos medios:

- Erros globais retornam `error.message`; pode vazar detalhes em alguns cenarios.
- `responseBody` de webhook e armazenado ate 2000 caracteres; pode registrar dados sensiveis retornados por terceiros.
- Sem auditoria administrativa.
- Sem politica de senha forte alem de tamanho minimo 6.
- Sem bloqueio por tentativas invalidas.

Decisao da fase: FAIL para producao.

