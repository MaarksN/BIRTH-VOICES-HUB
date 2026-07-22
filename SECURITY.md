# Security Guidelines

Security is a foundational element of the Birth Voices Hub. This document outlines the core security mechanisms in place.

## Authentication (JWT)

We use JSON Web Tokens (JWT) for stateless authentication.
- **Access Tokens**: Short-lived (15 min) tokens used for API access. Set as an `httpOnly`, `Secure` (in production), `SameSite=Strict` cookie on login/register/refresh; also accepted via the `Authorization: Bearer` header for non-browser clients.
- **Refresh Tokens**: Longer-lived (30 day) tokens, stored the same way as `httpOnly` cookies, used to obtain a new Access Token without requiring re-login. Cookie `maxAge` on both is aligned to the token's actual expiry (`src/lib/cookies.ts`).
- **CSRF**: mutating requests (`POST`/`PUT`/`DELETE`) are validated against the `Origin` header in production; a missing `Origin` on such a request is rejected outside of same-site tooling exceptions (`src/middlewares/index.ts`).

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
- **CORS**: Configured to only allow requests from origins listed in `ALLOWED_ORIGINS`.
- **Rate Limiting**: Redis-backed. A global limit (200 req/60s per IP) applies to the whole API, plus a tighter limit (10 req/60s per IP) on `/api/auth/login` and `/api/auth/register` specifically, to slow down credential-stuffing/brute-force attempts that the global limit alone wouldn't catch.
- **Data Validation**: `zod` is used strictly in controllers to sanitize and validate all incoming request bodies and query parameters.
