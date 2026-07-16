# Local Development Guide

This guide explains how to set up the Birth Voices Hub for local development.

## Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- Git

## Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd birth-voices-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your local configurations. Ensure `DATABASE_URL` and `REDIS_URL` are correct.

4. **Start Infrastructure Services:**
   We use Docker to run PostgreSQL and Redis locally.
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Initialize Database:**
   Apply Prisma migrations to create the database schema.
   ```bash
   npx prisma migrate dev
   ```
   (Optional) Run seeds if available:
   ```bash
   npm run prisma:seed
   ```

## Running the Application

### Development Mode
To run the server with hot-reloading:
```bash
npm run dev
```

### Production Build
To test the production build locally:
```bash
npm run build
npm start
```

## Running Tests

We use Vitest for our testing suite.
```bash
npm run test
```
To run tests with UI:
```bash
npm run test -- --ui
```

## Code Quality

Before pushing, ensure your code passes linting and type checking:
```bash
npm run typecheck
npm run lint
```
