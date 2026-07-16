# ADR 004: Redis for Caching and Queues

## Status
Accepted

## Context
The platform needs a fast, in-memory data store to handle rate limiting, session caching, and background job queuing (via BullMQ).

## Decision
We chose Redis.

## Consequences
- **Positive:** Extremely low latency, robust data structures, industry standard for queuing systems (BullMQ).
- **Negative:** Adds infrastructure complexity (another stateful service to manage and monitor). Data volatility if not configured with persistence.
