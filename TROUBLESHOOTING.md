# Troubleshooting Guide

This guide addresses common issues encountered during development and deployment of Birth Voices Hub.

## Common Issues

### 1. Prisma Client Errors (`PrismaClientInitializationError` / `PrismaClientKnownRequestError`)
**Symptoms:** Cannot connect to database, "table does not exist" errors.
**Solutions:**
- Ensure the PostgreSQL Docker container is running (`docker-compose ps`).
- Verify `DATABASE_URL` in your `.env` file is correct.
- Ensure migrations have been applied: run `npx prisma migrate dev`.
- If schema changed recently, regenerate the client: `npx prisma generate`.

### 2. Redis Connection Issues
**Symptoms:** BullMQ errors, rate limiter failing, "ECONNREFUSED".
**Solutions:**
- Ensure the Redis Docker container is running.
- Verify `REDIS_URL` in `.env`. Default local is usually `redis://localhost:6379`.

### 3. Port Already in Use (EADDRINUSE)
**Symptoms:** Server fails to start, complaining about port 5001 or 5173.
**Solutions:**
- Kill the process using the port: `kill -9 $(lsof -t -i:5001)` (Linux/macOS).

### 4. TypeScript Errors on Build
**Symptoms:** `npm run build` fails with TS errors.
**Solutions:**
- Run `npm run typecheck` locally. Fix any strict typing issues. Do not use `@ts-ignore` as it violates project standards. Ensure all imports have the `.js` extension if using ES Modules natively.

### 5. Multi-Tenancy Data Leaks (Missing Tenant ID)
**Symptoms:** Seeing data that belongs to another tenant, or queries failing with missing relations.
**Solutions:**
- Ensure you are calling `req.user.tenantId` in the controller and passing it down to the service and repository layers.
- Check the Prisma schema to ensure the model has a `tenantId` field and relation.