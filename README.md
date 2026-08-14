# Birth Voices Hub

Plataforma multi-tenant de agentes de voz e texto com React, Node.js/Express, PostgreSQL/Prisma, Redis/BullMQ, telefonia Twilio e gateway de IA com fallback entre provedores.

## Estado do produto

A linha de produção é protegida por CI e por gates server-side. Um commit elegível a release precisa passar por:

```text
Prisma migrate → seed → lint → typecheck → Vitest → build → Playwright/Chromium → Docker build
```

O deploy do Cloud Run só é disparado após CI bem-sucedido e usa **o mesmo SHA testado**, com `prisma migrate deploy` antes da promoção da imagem.

### Studio e runtime de voz

Workflows publicados são executados no caminho telefônico real. O runtime de produção desta versão suporta:

- `start`
- `llm`
- `prompt`
- `question`
- `condition`
- `switch`
- `memory`
- `end`

O servidor bloqueia a publicação de grafos que usam semântica ainda não executável com segurança. `voice`, `knowledge`, `tool` e `human_handoff` permanecem como recursos de evolução/preview do Studio até receberem executor de produção e testes correspondentes.

### Privacidade e consentimento

Chamadas a provedores externos de IA são tenant-scoped e exigem consentimento registrado para o tenant quando carregam dados de clientes/contatos. A integração AtlasGR/Bland também aplica essa regra. Gravação de chamadas Bland é **opt-in** e fica desligada por padrão.

## Primeiro uso local

Requisitos:

- Node.js 22+
- Docker / Docker Compose
- PostgreSQL e Redis, normalmente via `docker-compose.yml`

```bash
npm ci
cp .env.example .env
docker compose up -d postgres redis
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Para executar no modo equivalente ao artefato de produção:

```bash
npm run build
npm start
```

A aplicação usa cookies seguros para sessão. O endpoint `GET /api/auth/me` é a fonte de verdade da identidade autenticada no frontend.

## Validação antes de abrir PR/release

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Os testes E2E sobem o build de produção e cobrem, além de health/landing, o ciclo de autenticação `register → /auth/me → logout → login`.

## Configuração de produção

Não copie valores de exemplos para produção e nunca versione `.env` real.

### Núcleo obrigatório

O preflight de `.github/workflows/deploy.yml` exige:

**GitHub Secrets**

- `GCP_PROJECT_ID`
- `GCP_SA_KEY` **ou** `GCP_CREDENTIALS`
- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_REDIS_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `GEMINI_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `WEBHOOK_SIGNING_SECRET`

**GitHub Variables do environment `production`**

- `PUBLIC_BASE_URL`
- `ALLOWED_ORIGINS`

`PUBLIC_BASE_URL` deve ser a origem HTTPS exata usada na configuração dos webhooks Twilio, porque participa da validação da assinatura da requisição.

OpenAI e Anthropic são opcionais. Os modelos também podem ser definidos por `GEMINI_MODEL`, `OPENAI_MODEL` e `ANTHROPIC_MODEL`.

### AtlasGR / Bland AI

A integração é opcional para o núcleo Twilio, mas é tratada como **bloco atômico**. Ao habilitá-la, configure todo o conjunto:

- `BLAND_API_KEY`
- `BLAND_WEBHOOK_TOKEN`
- `ATLASGR_WEBHOOK_SECRET`
- `ATLASGR_TENANT_ID`
- `ATLASGR_BASE_URL`

Opcionalmente:

- `BLAND_RECORD_CALLS=false` por padrão
- `ATLASGR_WEBHOOK_IDEMPOTENCY_TTL_SECONDS=86400`

O tenant apontado por `ATLASGR_TENANT_ID` precisa ter consentimento de IA registrado antes de dados de lead serem enviados ao provedor externo.

## Segurança de secrets

Se uma credencial apareceu em histórico Git, removê-la do `HEAD` **não a torna segura novamente**. Rotacione a credencial no sistema de origem, invalide o valor antigo e salve o valor novo apenas no environment/secret manager apropriado.

Consulte [`docs/secrets-guide.md`](./docs/secrets-guide.md) para o checklist operacional completo.

## Documentação

- [Arquitetura](./ARCHITECTURE.md)
- [API](./API_REFERENCE.md)
- [Desenvolvimento](./DEVELOPMENT.md)
- [Deploy](./DEPLOYMENT.md)
- [Segurança](./SECURITY.md)
- [Testes](./TESTING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Runbook de produção](./docs/RUNBOOK.md)
- [Secrets e variáveis](./docs/secrets-guide.md)
- [Roadmap](./ROADMAP.md)
- [Contribuição](./CONTRIBUTING.md)

### Pastas técnicas

- [ADRs](./docs/adr)
- [OpenAPI e integrações](./docs/api)
- [SDKs](./docs/sdk)
- [Exemplos](./docs/examples)
- [Webhooks](./docs/webhooks)
- [CLI](./docs/cli)
- [IA](./docs/ai)
- [Padrões](./docs/patterns)
- [Diagramas](./docs/diagrams)
- [DX](./docs/dx)
- [Testes](./docs/tests)
