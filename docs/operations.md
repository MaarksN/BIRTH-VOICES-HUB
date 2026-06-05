# Operações e Observabilidade

## Request ID

Toda resposta recebe `X-Request-Id`. Se o cliente enviar `X-Request-Id`, o servidor reutiliza o valor quando ele tiver tamanho seguro.

## Logs

O backend emite logs JSON com:

- `timestamp`
- `level`
- `request_id`
- `method`
- `path`
- `status`
- `latency_ms`
- `user_id`, quando autenticado
- `tenant_id`, quando resolvido

O corpo da requisição não é logado.

## Health check

`GET /api/health` valida:

- API viva
- diretório de storage acessível
- configuração de Gemini, Twilio e Sentry
- política de retenção ativa

## Métricas

`GET /api/metrics` exige permissão administrativa e retorna contadores em memória:

- requests
- 4xx
- 5xx
- latência média
- falhas de webhook
- falhas Gemini
- falhas Twilio

## Alertas recomendados

- 5xx maior que 1% por 10 minutos.
- Falhas de webhook acima de 5 em 15 minutos.
- Falhas Gemini consecutivas acima de 3.
- Health check `degraded`.
- Crescimento inesperado de `auditLogs` ou `integrationDeliveries`.

## Troubleshooting

1. Verifique `/api/health`.
2. Procure o `request_id` nos logs JSON.
3. Confira `/api/metrics`.
4. Para webhooks, revise `Developers > Histórico de entregas`.
5. Para telefonia, confira assinatura Twilio e `PUBLIC_BASE_URL`.
