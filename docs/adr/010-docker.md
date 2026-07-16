# ADR 010: Docker Containerization

## Status
Accepted

## Context
To ensure consistency across local development, staging, and production environments, we need a reliable packaging strategy.

## Decision
We use Docker to containerize the Node.js application and Docker Compose to orchestrate local dependencies (PostgreSQL, Redis).

## Consequences
- **Positive:** "Works on my machine" guarantee. Seamless deployment to modern cloud platforms like Google Cloud Run.
- **Negative:** Requires developers to understand Docker. Slower local hot-reload if developing entirely inside containers (though we support native `npm run dev`).
