# ADR 005: BullMQ for Background Jobs

## Status
Accepted

## Context
The platform needs to execute long-running tasks (e.g., webhook delivery, AI prompt processing, report generation) without blocking the main HTTP event loop.

## Decision
We adopted BullMQ (backed by Redis) as our job queue.

## Consequences
- **Positive:** Reliable task execution, robust retry mechanics, Dead Letter Queues (DLQ) support, rate limiting for jobs.
- **Negative:** Dependent on Redis availability. Adds complexity to local development setup.
