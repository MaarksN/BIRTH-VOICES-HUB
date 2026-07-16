# ADR 006: Logical Row-Level Multi-Tenancy

## Status
Accepted

## Context
The platform must serve multiple organizations (tenants) while keeping their data strictly isolated to meet security and compliance requirements.

## Decision
We chose Logical Row-Level Multi-Tenancy. Every tenant-scoped table includes a `tenantId` foreign key. Isolation is enforced manually via the Repository layer and RBAC middleware.

## Consequences
- **Positive:** Simpler infrastructure compared to database-per-tenant. Easier aggregation of cross-tenant analytics if needed.
- **Negative:** High risk of data leaks if a query accidentally omits the `tenantId` filter. Requires strict code review and testing discipline.
