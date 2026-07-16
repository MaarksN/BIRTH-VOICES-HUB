# ADR 007: Role-Based Access Control (RBAC)

## Status
Accepted

## Context
We need a granular system to control which users can perform specific actions within a tenant.

## Decision
We implemented a custom RBAC model: `User` -> `Membership` -> `Role` -> `Permission`. Endpoint access is guarded by a `requireRole` middleware.

## Consequences
- **Positive:** Highly flexible. Supports custom roles per tenant in the future.
- **Negative:** Checking permissions on every request adds slight overhead. Complexity in managing permission seeding and migration.
