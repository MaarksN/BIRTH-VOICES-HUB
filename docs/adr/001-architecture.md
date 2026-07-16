# ADR 001: Clean Architecture Adoption

## Status
Accepted

## Context
The legacy application suffered from tight coupling between HTTP routing, business logic, and data access. This made it difficult to test, maintain, and scale, especially when introducing multi-tenancy.

## Decision
We adopted Clean Architecture principles. The application is divided into distinct layers:
- **Routes:** Define HTTP endpoints and attach middleware.
- **Controllers:** Handle HTTP request/response formatting and validation (using Zod).
- **Services:** Contain pure business logic, orchestrate calls. Agnostic to HTTP.
- **Repositories:** Handle data access and persistence, enforcing tenant isolation.

## Consequences
- **Positive:** Improved testability (services can be unit tested without HTTP context). Better separation of concerns. Easier to swap underlying technologies.
- **Negative:** Increased initial boilerplate (more files and boilerplate code).
