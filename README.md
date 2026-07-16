# Birth Voices Hub - Enterprise Platform

Welcome to the Birth Voices Hub. This platform is a fully multi-tenant, enterprise-grade system designed with Clean Architecture, leveraging Node.js, PostgreSQL (via Prisma), Redis, BullMQ, and React.

## Documentation Index

The documentation has been structured to support developers, partners, and integrations. Please refer to the specific sections below:

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Development Guide](./DEVELOPMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guidelines](./SECURITY.md)
- [Testing Strategy](./TESTING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Production Runbook](./docs/RUNBOOK.md)
- [Secrets Guide](./docs/secrets-guide.md)
- [Roadmap](./ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)

### Detailed Documentation Folders
- [ADRs (Architecture Decision Records)](./docs/adr)
- [API Specs (OpenAPI, Postman, Insomnia)](./docs/api)
- [SDKs](./docs/sdk)
- [Code Examples](./docs/examples)
- [Webhooks](./docs/webhooks)
- [CLI Docs](./docs/cli)
- [AI Capabilities](./docs/ai)
- [Design Patterns](./docs/patterns)
- [Diagrams](./docs/diagrams)
- [Developer Experience (DX)](./docs/dx)
- [Tests](./docs/tests)

---

## Environment Variables

| Name | Required? | DEV | CI | STAGING/PROD | Used in | Impact if missing |
|---|---|---|---|---|---|---|
| `DATABASE_URL` | **Required** | `.env` (docker-compose) | Fixed CI value (`ci.yml`) | GitHub Secret `PRODUCTION_DATABASE_URL` | `prisma/schema.prisma` | Prisma Client fails to connect on first query |
| `REDIS_URL` | **Required** | `.env` (docker-compose) | Fixed CI value (`ci.yml`) | GitHub Secret `PRODUCTION_REDIS_URL` | `server.ts`, `src/services/audit.ts` (via `src/lib/env.ts`) | **Fails fast at startup** in production (`NODE_ENV=production`) if unset; falls back to `redis://localhost:6379` only in dev/test |
| `JWT_SECRET` | **Required** | `.env` | Fixed CI value (`ci.yml`) | GitHub Secret `JWT_SECRET` | `src/lib/auth-tokens.ts` | Throws at the first login/token operation |
| `REFRESH_TOKEN_SECRET` | **Required** | `.env` | Fixed CI value (`ci.yml`) | GitHub Secret `REFRESH_TOKEN_SECRET` | `src/lib/auth-tokens.ts` | Throws at the first refresh-token operation |
| `GEMINI_API_KEY` | **Required** | `.env` | Not set (AI routes untested in CI) | GitHub Secret `GEMINI_API_KEY` | `src/controllers/ai.controller.ts`, `lib/voice-runtime/providers/LLMGateway.ts` | AI features throw at call time; Gemini is the guaranteed fallback for the LLM chain, so its absence blocks all AI functionality |
| `ALLOWED_ORIGINS` | Optional | `.env` | Fixed CI value (`ci.yml`) | GitHub Variable `ALLOWED_ORIGINS` | `server.ts` | Falls back to `http://localhost:${PORT}`; in production this would reject the real frontend's CORS origin |
| `OPENAI_API_KEY` | Optional | `.env` | — | GitHub Secret (if used) | `lib/voice-runtime/providers/LLMGateway.ts` | Only the OpenAI leg of the LLM fallback chain is unavailable (falls back to Gemini) |
| `ANTHROPIC_API_KEY` | Optional | `.env` | — | GitHub Secret (if used) | `lib/voice-runtime/providers/LLMGateway.ts` | Only the Claude leg of the LLM fallback chain is unavailable (falls back to Gemini) |
| `PORT` | Optional | `.env` | — | — | `server.ts` | Falls back to `3000` |
| `GCP_PROJECT_ID` | **Required for deploy** | — | — | GitHub Secret `GCP_PROJECT_ID` | `.github/workflows/deploy.yml` | Deploy workflow fails (empty project ID for Artifact Registry/Cloud Run) |
| `GCP_SA_KEY` | **Required for deploy** | — | — | GitHub Secret `GCP_SA_KEY` | `.github/workflows/deploy.yml` | Deploy workflow fails at the "Authenticate to Google Cloud" step |

See [`docs/security/secrets-guide.md`](./docs/security/secrets-guide.md) for where to configure each of these in GitHub. Never commit real values — `.env.example` only contains placeholders.

---

## Infrastructure

The project is fully containerized and production-ready for deployment to Google Cloud Run or any Docker-compatible infrastructure.

### Local Development

1. Setup environment variables:
   ```bash
   cp .env.example .env
   ```

2. Start the persistent services (PostgreSQL & Redis):
   ```bash
   docker-compose up -d postgres redis
   ```

3. Initialize the database schema:
   ```bash
   npx prisma migrate dev
   ```

4. Start the application in development mode:
   ```bash
   npm run dev
   ```
   *(For a production-style run: `npm run build && npm start`)*

### Full Stack Execution

To run the complete application stack (Node.js, PostgreSQL, Redis) locally:
```bash
docker-compose up --build -d
```
