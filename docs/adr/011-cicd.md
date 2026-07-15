# ADR 011: GitHub Actions for CI/CD

## Status
Accepted

## Context
We need automated enforcement of code quality standards and a reliable, repeatable deployment process to Google Cloud Platform.

## Decision
We implemented GitHub Actions as our CI/CD pipeline.

## Consequences
- **Positive:** Tight integration with source control. Automated gating on linting, typechecking, and tests prevents broken code from reaching `main`. Automated image building and deployment to Cloud Run.
- **Negative:** Requires managing secrets in GitHub. Debugging workflow failures can sometimes be slow.
