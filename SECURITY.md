# Security Guidelines

Security is a foundational element of the Birth Voices Hub. This document outlines the core security mechanisms in place.

## Authentication (JWT)

We use JSON Web Tokens (JWT) for stateless authentication.
- **Access Tokens**: Short-lived tokens used for API access. Passed via the `Authorization: Bearer` header.
- **Refresh Tokens**: Longer-lived tokens stored securely (preferably as HttpOnly cookies in the future, currently handled via API payloads) to obtain new Access Tokens without requiring re-login.

## Multi-Tenancy Isolation

The platform enforces strict data isolation between tenants.
- **Row-Level Security**: Every model in the Prisma schema (except core global models) contains a `tenantId`.
- **Middleware Validation**: The `requireAuth` middleware automatically attaches the authenticated user's `tenantId` to the request context.
- **Repository Enforcement**: All repository methods explicitly filter by `tenantId` to ensure a user can never access data belonging to another tenant.

## Role-Based Access Control (RBAC)

Authorization is managed via an RBAC system.
- Users belong to a `Tenant` via a `Membership`.
- A `Membership` is associated with a `Role` (e.g., Admin, User).
- Roles have specific `Permissions`.
- Endpoint access is guarded by the `requireRole` middleware.

## API Protection

- **Helmet**: Secures HTTP headers, setting policies like Content Security Policy (CSP), X-Frame-Options, and X-XSS-Protection.
- **CORS**: Configured to only allow requests from trusted origins.
- **Rate Limiting**: Redis-backed rate limiting prevents brute-force and DDoS attacks.
- **Data Validation**: `zod` is used strictly in controllers to sanitize and validate all incoming request bodies and query parameters.
