# Architecture Overview

Birth Voices Hub is a multi-tenant enterprise platform built on a robust, scalable stack designed for modern web applications.

## High-Level Architecture

The system is divided into several key layers:

1.  **Presentation / Routing Layer (Express.js)**
    *   Defines HTTP routes and attaches middleware (Auth, RBAC, Validation).
    *   Delegates request handling to Controllers.

2.  **Controller Layer**
    *   Handles HTTP request/response mapping.
    *   Extracts parameters, headers, and body.
    *   Calls appropriate Service layer methods.
    *   Returns formatted HTTP responses.

3.  **Service Layer (Business Logic)**
    *   Contains the core business rules and workflows.
    *   Orchestrates calls to Repositories and external integrations (AI Providers, Webhooks).
    *   Agnostic of HTTP context.

4.  **Repository Layer (Persistence)**
    *   Abstracts data access logic using Prisma ORM.
    *   Enforces multi-tenancy rules at the query level.

5.  **Background Processing (BullMQ & Redis)**
    *   Handles asynchronous tasks (e.g., heavy processing, webhooks, scheduled jobs).
    *   Ensures reliable execution with retries and dead-letter queues.

## Core Technologies

*   **Backend:** Node.js, Express, TypeScript
*   **Database:** PostgreSQL (via Prisma ORM)
*   **Caching & Queues:** Redis (via BullMQ)
*   **Frontend:** React, Vite, Zustand, @xyflow/react
*   **Observability:** OpenTelemetry (Traces, Metrics)

## Multi-Tenancy

The platform uses a logical separation model (Row-Level Multi-Tenancy). Every tenant-specific entity contains a `tenantId`. The application enforces tenant isolation in the Repository layer and via RBAC middleware.

For architectural decisions, see the [ADRs](./docs/adr/) folder.
