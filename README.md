# Birth Voices Hub

Plataforma local para criar agentes de voz estruturados, conduzir conversas no navegador, registrar transcrições, analisar resultados com Gemini e entregar sessões para CRM, ATS, n8n, Make ou outro backend via webhook.

## O que está funcional

- Autenticação local com senha hasheada.
- Criação, edição, listagem e exclusão de agentes persistidos no backend.
- Playground de voz com síntese em português, reconhecimento de fala quando o navegador permite e fallback por texto.
- Roteiro estruturado: Catarina conduz pergunta por pergunta conforme o agente configurado.
- Telefonia real via Twilio: chamada de saída, webhooks TwiML, coleta por fala e sessão automática ao final.
- Análise e extração estruturada com Gemini quando `GEMINI_API_KEY` está configurada.
- Registro determinístico sem LLM quando Gemini não estiver configurado.
- Persistência real em `data/birth-voices.json`.
- Entrega automática de sessões via webhook assinado com `X-Birth-Voices-Signature`.
- Dashboards sem dados fictícios: métricas aparecem somente a partir dos dados salvos.

## Rodar localmente

1. Instale dependências:

```bash
npm install
```

2. Crie `.env` a partir de `.env.example` e configure pelo menos:

```bash
GEMINI_API_KEY=...
```

3. Inicie:

```bash
npm run dev
```

4. Abra:

```text
http://localhost:3000
```

## Integrações

Em `Developers`, configure uma URL de webhook do seu CRM/ATS/n8n/backend. Ao salvar uma sessão, o backend envia:

- `event: session.completed`
- transcrição completa
- resumo
- sentimento
- nível de risco
- score
- tags
- campos extraídos
- próxima ação

Se um segredo for configurado, o payload é assinado com HMAC SHA-256 no header `X-Birth-Voices-Signature`.

## Telefonia Twilio

Para chamadas telefônicas reais, configure:

```bash
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+5511999999999
PUBLIC_BASE_URL=https://sua-url-publica.com
```

`PUBLIC_BASE_URL` precisa ser acessível pela Twilio, pois a chamada usa:

- `POST /api/twilio/voice/:callId` para iniciar o roteiro por voz.
- `POST /api/twilio/voice/:callId/answer` para capturar respostas faladas.
- `POST /api/twilio/status/:callId` para atualizar status da chamada.

Quando o roteiro termina ou uma palavra de risco interrompe a conversa, a plataforma salva a sessão e dispara o webhook configurado.

## Build

```bash
npm run build
```
