# ADR 002: PostgreSQL as Primary Datastore

## Status
Accepted

## Context
We need a robust, ACID-compliant database to handle complex relational data like multi-tenancy hierarchies (Tenants -> Memberships -> Roles -> Users), transaction logs, and structured business entities.

## Decision
We chose PostgreSQL as the primary relational database.

## Consequences
- **Positive:** Strong consistency, support for complex joins, excellent JSONB support for semi-structured data (like workflow nodes/edges), robust ecosystem.
- **Negative:** Requires careful schema migration management and scaling considerations compared to NoSQL alternatives.
