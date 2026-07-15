# Platform Roadmap

This document outlines the strategic vision and upcoming features for Birth Voices Hub.

## Phase 1: Enterprise Foundation (Current)
- [x] Consolidate backend architecture (Clean Architecture).
- [x] Implement robust PostgreSQL Multi-Tenancy via Prisma.
- [x] Establish secure RBAC and Authentication (JWT).
- [x] Setup comprehensive Developer Experience documentation.
- [x] CI/CD Pipeline integration (GitHub Actions to GCP).

## Phase 2: API & Integrations
- [ ] Finalize OpenAPI 3.1 specification for all endpoints.
- [ ] Release official TypeScript and JavaScript SDKs.
- [ ] Implement robust Webhook system with retry mechanisms (BullMQ).
- [ ] Provide Postman and Insomnia workspaces for partners.

## Phase 3: AI & Voice Capabilities
- [ ] Enhance Voice Runtime controllers with streaming support.
- [ ] Implement RAG (Retrieval-Augmented Generation) infrastructure for Agents.
- [ ] Expand AI Provider integrations beyond Gemini (e.g., OpenAI, Anthropic).
- [ ] Create detailed Prompt Manager tooling.

## Phase 4: Advanced Observability & Scaling
- [ ] Full OpenTelemetry integration (Traces, Metrics, Logs) across all services.
- [ ] Implement horizontal auto-scaling based on queue depth in Cloud Run.
- [ ] Deploy a dedicated CLI tool for platform management.
