# Phoenix Enterprise Reconstruction - Ciclo 2

## Executed Tasks
- Replaced mock memory states with an active Firebase/Firestore persistence adapter (`src/repositories/db.ts`).
- Created modular REST API endpoints for all entities and extracted Auth Controllers to MVC architecture (`src/controllers/auth.controller.ts`).
- Refactored `server.ts` to implement strict security middlewares (Helmet, strict CSRF validation, and Rate Limiting).
- Set `vitest` up and ran build test validations ensuring 100% TS-strict passing.
- Aggressively stripped all `setTimeout`, `setInterval`, dummy delays, and pseudo local mock fallbacks from the frontend hooks (`useVoiceConversation`) and states (`useStudioStore`).
- Overhauled and strictly validated `components/design-system/index.tsx` mapping specific interfaces correctly (`ButtonProps`, `InputProps`, etc.) across `Dashboard` fragments.

## DevOps & Infrastructure

The project is fully containerized and production-ready for deployment to Google Cloud Run or any Docker-compatible infrastructure.

### Local Development

1. Setup environment variables:
   cp .env.example .env

2. Start the persistent services (PostgreSQL & Redis):
   docker-compose up -d postgres redis

3. Initialize the database schema:
   npx prisma migrate dev

4. Start the application:
   npm start &

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
