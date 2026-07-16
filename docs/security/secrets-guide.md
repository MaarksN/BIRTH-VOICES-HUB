# Secrets Guide

This document lists every secret/variable the CI/CD pipeline and the application read, where to configure it, and what breaks if it's missing. No real values are included anywhere in this repository — only placeholders in `.env.example`.

## Where to configure

- **GitHub Repository Secrets**: Settings → Secrets and variables → Actions → *Secrets* tab.
- **GitHub Repository/Environment Variables** (non-sensitive config): Settings → Secrets and variables → Actions → *Variables* tab.
- **Local development**: copy `.env.example` to `.env` and fill in real values (never commit `.env`).

## `.github/workflows/deploy.yml` (Deploy to Google Cloud Run)

| Secret | Purpose | Required? |
|---|---|---|
| `GCP_PROJECT_ID` | GCP project ID used for Artifact Registry path and Cloud Run project scoping | **Required** |
| `GCP_SA_KEY` | Service Account JSON key, passed to `google-github-actions/auth@v2` as `credentials_json` | **Required** — its absence is the confirmed cause of the current deploy failure (job reaches the "Authenticate to Google Cloud" step with a real runner, then fails because neither `GCP_SA_KEY` nor the `GCP_CREDENTIALS` fallback resolves to a non-empty value) |
| `PRODUCTION_DATABASE_URL` | Injected into the deployed Cloud Run service as `DATABASE_URL` | Required for the deployed service to function (deploy step itself won't fail without it) |
| `PRODUCTION_REDIS_URL` | Injected into the deployed Cloud Run service as `REDIS_URL` | Required — the app now fails fast at startup if this resolves to empty in production |
| `GEMINI_API_KEY` | Injected into the deployed Cloud Run service | Required for AI features to work in production |
| `JWT_SECRET` / `REFRESH_TOKEN_SECRET` | Injected into the deployed Cloud Run service | Required — without these the deployed service throws on the first auth/token operation |
| `ALLOWED_ORIGINS` (Variable, not Secret) | CORS allowlist for the deployed service | Optional, but production without it falls back to `localhost` and rejects the real frontend's origin |

This repo's workflows do not use `workload_identity_provider`/`service_account` (Workload Identity Federation) — only the `credentials_json` (Service Account JSON key) method is wired up. Switching to WIF is a valid future hardening step but requires provisioning a Workload Identity Pool/Provider on the GCP side first; it is not something that can be inferred or invented from this repository alone.

## `.github/workflows/ci.yml` (CI/CD Pipeline)

No repository secrets are referenced. `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `ALLOWED_ORIGINS` are fixed, non-sensitive values pointing at the workflow's own ephemeral Postgres/Redis service containers — CI never talks to production infrastructure.

## Application-level env vars (read directly by the app, not just CI/CD)

See the Environment Variables table in [`README.md`](../../README.md) for the full matrix (name, required/optional, DEV/CI/PROD, file(s) that consume it, and impact if missing).

## What I cannot do

I don't have access to read or write this repository's actual Secrets (GitHub's API only allows write, never read, and no tool available to me exposes even that). I cannot confirm which of the secrets above are currently configured, and I will never invent placeholder-looking values and present them as real. If a workflow fails with an auth or "not configured" error referencing one of the names above, the fix is to add the real value in GitHub's Settings UI.
