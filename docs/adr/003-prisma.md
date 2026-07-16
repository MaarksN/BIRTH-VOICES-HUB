# ADR 003: Prisma as ORM

## Status
Accepted

## Context
Interacting with PostgreSQL requires a robust query builder or ORM. We need strong typing to prevent runtime errors and a reliable migration system.

## Decision
We adopted Prisma as our ORM.

## Consequences
- **Positive:** Excellent TypeScript integration and autocompletion. Declarative schema definition (`schema.prisma`). Reliable and trackable database migrations.
- **Negative:** Abstraction can sometimes obscure complex or highly optimized SQL queries. Slight performance overhead compared to raw SQL drivers.
