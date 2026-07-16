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
