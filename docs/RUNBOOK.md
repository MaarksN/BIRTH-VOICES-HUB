# Production Runbook

Este documento orienta os procedimentos padrão de resposta a incidentes, implantação e operação da infraestrutura do **Birth Voices Hub**.

## 1. Deploy e Escalabilidade
- **Plataforma:** Google Cloud Run.
- **Rollback:** O Cloud Run retém revisões anteriores. Em caso de quebra de produção, navegue até o painel do Cloud Run e redirecione 100% do tráfego para a revisão imediatamente anterior.
- **Auto-scaling:** O limite atual permite até `100` instâncias paralelas.

## 2. Telemetria e Logs
- Os logs são canalizados para o **Google Cloud Logging** (Stdout) e para a plataforma OpenTelemetry, se configurada.
- Erros de WebSocket (`Socket.IO`) reportam diretamente na interface do Live Supervisor.

## 3. Rate Limiting e Abusos
Se o servidor enfrentar tráfego abusivo, o Redis (`global` limiter) retornará automaticamente `429 Too Many Requests`.
- Para banimentos permanentes, utilize a camada de rede do Cloud Armor ou modifique a secret `PRODUCTION_ALLOWED_ORIGINS` para rejeitar o domínio agressor.

## 4. Troubleshooting do Banco de Dados (Prisma)
Se as transações começarem a acumular tempo de espera ou houver erro de N+1 evidenciado no log de tracing:
1. Revise se o pool de conexões PostgreSQL atende à carga atual (padrão é max 20 connections no Prisma).
2. Para instanciar conexões diretas para leitura, adicione `?pgbouncer=true` à URL do Banco na secret.

## 5. Falha de Dependências de Voz (Twilio / ElevenLabs)
- A aplicação possui fallback interno de Voice Providers no runtime, que contorna indisponibilidade pontual do ElevenLabs revertendo a requisição.
- Verifique a secret `GEMINI_API_KEY` caso o orquestrador pare de responder ou apresente alucinações constantes (ver Knowledge Confidence Engine logs).
