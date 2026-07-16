# Phoenix Enterprise Reconstruction - Ciclo 2

## Executed Tasks
- Replaced the in-memory/mock persistence layer with real PostgreSQL persistence via Prisma (`prisma/schema.prisma`, `prisma/migrations/`), scoped to genuine multi-tenancy (`Tenant` → `Membership` → `Role`).
- Consolidated the previously duplicated `server/` and `src/` backend trees into a single layered architecture (`src/controllers`, `src/services`, `src/repositories`, `src/routes`), mounted from `server.ts`.
- Refactored `server.ts` to implement security middlewares (Helmet with CSP, CORS, Redis-backed rate limiting, CSRF validation, authenticated Socket.IO handshake) and `/health`, `/live`, `/ready` endpoints.
- Set `vitest` up with a real integration + unit test suite (`__tests__/`) covering auth, tenant isolation, RBAC, and service-layer business logic.
- Configured a real ESLint flat config (`eslint.config.js`) and wired CI to gate on lint/typecheck/test/build.

## DevOps & Infrastructure

The project is fully containerized and production-ready for deployment to Google Cloud Run or any Docker-compatible infrastructure.

### Local Development

1. Setup environment variables:
   cp .env.example .env

2. Start the persistent services (PostgreSQL & Redis):
   docker-compose up -d postgres redis

3. Initialize the database schema:
   npx prisma migrate dev

4. Start the application in development mode:
   npm run dev

   (For a production-style run: `npm run build && npm start`.)

### Running with Docker Compose (Full Stack)

To run the complete application stack (Node.js, PostgreSQL, Redis) locally:
docker-compose up --build -d

### Production Deployment (Google Cloud Run)

The repository includes a GitHub Actions workflow (\`deploy.yml\`) for seamless deployment.
1. Add the following secrets to your GitHub Repository:
   - \`GCP_PROJECT_ID\`
   - \`GCP_SA_KEY\` (Service Account JSON Key)
   - \`PRODUCTION_DATABASE_URL\`
   - \`PRODUCTION_REDIS_URL\`
   - \`GEMINI_API_KEY\`
2. Push to the \`main\` branch to trigger the CI/CD pipeline which automatically builds, pushes to Artifact Registry, and deploys to Cloud Run.
