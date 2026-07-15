# ADR 009: OpenTelemetry for Observability

## Status
Accepted

## Context
As a distributed enterprise system, diagnosing performance issues and tracking requests across services (API, Queues) is critical.

## Decision
We adopted OpenTelemetry to generate and collect traces and metrics.

## Consequences
- **Positive:** Vendor-agnostic instrumentation. Deep visibility into request flows, Prisma queries, and Redis operations.
- **Negative:** Adds slight performance overhead. Requires setting up an OTLP collector backend (e.g., Jaeger, Prometheus, or Google Cloud Trace) in production.
