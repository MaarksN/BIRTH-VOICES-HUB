# Deployment Guide

Birth Voices Hub is containerized and designed for deployment on Google Cloud Platform (GCP) via Cloud Run, but can be deployed to any Docker-compatible environment.

## Docker Deployment

The application is packaged using a multi-stage `Dockerfile`.

### Building the Image
```bash
docker build -t birth-voices-hub:latest .
```

### Running the Image
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/db" \
  -e REDIS_URL="redis://host:6379" \
  -e JWT_SECRET="your-secret" \
  -e REFRESH_TOKEN_SECRET="your-refresh-secret" \
  -e ALLOWED_ORIGINS="https://your-production-domain.com" \
  birth-voices-hub:latest
```
`JWT_SECRET` and `REFRESH_TOKEN_SECRET` are both required — the server throws on the
first auth operation if either is unset (`src/lib/auth-tokens.ts#requireSecret`).

## CI/CD Pipeline (GitHub Actions)

We use GitHub Actions for continuous integration and continuous deployment.

### Workflow Steps
1. **Setup**: Checkout code, setup Node.js.
2. **Install**: Install npm dependencies and cache them.
3. **Validate**: Run linting (`eslint`) and typechecking (`tsc`).
4. **Test**: Run the Vitest test suite.
5. **Build**: Generate the Prisma client and build the application (`npm run build`).
6. **Docker Build & Push**: Build the Docker image and push to Google Artifact Registry.
7. **Deploy**: Deploy the new image to Google Cloud Run.

## Google Cloud Platform (GCP) Setup

### Secrets Management
The following secrets must be configured in your GitHub Repository (Settings →
Secrets and variables → Actions):
- `GCP_PROJECT_ID`: Your Google Cloud Project ID.
- `GCP_SA_KEY` (or `GCP_CREDENTIALS` as a fallback): JSON key for a Service Account with permissions to push to Artifact Registry and deploy to Cloud Run.
- `PRODUCTION_DATABASE_URL`: Connection string for your production PostgreSQL instance (e.g., Cloud SQL).
- `PRODUCTION_REDIS_URL`: Connection string for your production Redis instance (e.g., Memorystore).
- `JWT_SECRET`: Secure random string for access-token signing.
- `REFRESH_TOKEN_SECRET`: Secure random string for refresh-token signing — **required**, deploy fails validation without it (same requirement as `JWT_SECRET`, easy to miss since it's a separate secret).
- `GEMINI_API_KEY`: API key for Google Gemini integration.
- `PRODUCTION_ALLOWED_ORIGINS` (recommended): comma-separated list of allowed CORS/Socket.IO origins for production. Without it, the app falls back to `http://localhost:$PORT`, which will reject requests from your real production frontend domain.

`deploy.yml` validates all of the above (except the optional `PRODUCTION_ALLOWED_ORIGINS`) are present before attempting to authenticate to GCP, and fails with a clear error naming whichever are missing.

### Infrastructure Dependencies
Ensure the following are provisioned in GCP before deployment:
1. **Cloud SQL for PostgreSQL**: Managed relational database.
2. **Memorystore for Redis**: Managed in-memory data store for caching and BullMQ.
3. **Artifact Registry**: Docker repository for storing built images.
4. **Cloud Run**: Serverless compute platform to host the application container.
