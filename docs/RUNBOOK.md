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

## 6. Configurar um número Twilio para receber ligações reais

O fluxo de voz real (`src/routes/telephony.routes.ts`) usa TwiML orientado a turnos (`<Gather input="speech">`), não Media Streams — Twilio faz o STT e chama nosso webhook a cada fala reconhecida.

1. Defina as secrets `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `PUBLIC_BASE_URL` (ver `.env.example`). `PUBLIC_BASE_URL` deve ser **exatamente** a URL pública usada abaixo — é contra ela que a assinatura Twilio (`X-Twilio-Signature`) é validada.
2. No Twilio Console, na configuração do número de telefone, em "Voice Configuration" → "A call comes in", aponte para:
   `POST {PUBLIC_BASE_URL}/api/telephony/twilio/voice`
3. Em "Call status changes", aponte para:
   `POST {PUBLIC_BASE_URL}/api/telephony/twilio/status`
4. Associe o número a um agente: `UPDATE "Agent" SET "phoneNumber" = '+15551234567' WHERE id = '...';` (ou defina `DEFAULT_AGENT_ID` para rotear todo número não mapeado a um único agente enquanto a atribuição por número não está exposta na UI).
5. **Teste local:** `npm run dev`, exponha a porta com um túnel HTTPS (`ngrok http 3000` ou equivalente), use a URL do túnel como `PUBLIC_BASE_URL` e nos webhooks do passo 2-3. Ligue para o número e confirme: a saudação toca, a fala é respondida por uma resposta real do LLM, e uma linha aparece em `Session`/`CallLog` após desligar.
6. Se o webhook retornar 403: a assinatura não bateu — confira se `PUBLIC_BASE_URL` é idêntico (protocolo, host, sem barra final) ao registrado no Twilio. Se retornar 503: `TWILIO_AUTH_TOKEN`/`PUBLIC_BASE_URL` não estão configurados no ambiente.
