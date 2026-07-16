# Developer Experience (DX) Guide

This folder contains guidelines and standards for a smooth developer experience within the Birth Voices Hub project.

## Onboarding for Developers

Welcome! To get started:
1. Ensure you have Node.js 18+ and Docker installed.
2. Clone the repository and run `npm install`.
3. Read the [Local Development Guide](../../DEVELOPMENT.md).
4. Familiarize yourself with the [Architecture Overview](../../ARCHITECTURE.md).

## Git Flow

We use a feature-branch workflow.
- `main`: Production-ready code.
- `feature/*`: New features.
- `fix/*`: Bug fixes.
- `chore/*`: Maintenance tasks.

## Versioning & Release Process

We follow [Semantic Versioning](https://semver.org/) (SemVer).
Releases are automated via GitHub Actions upon tagging a commit on the `main` branch.

## Conventions

- **Commits**: We strictly follow [Conventional Commits](https://www.conventionalcommits.org/).
- **Code Style**: Enforced by ESLint and Prettier. Run `npm run lint` before committing.
- **TypeScript**: Strict mode is enabled. Do not use `any` or `@ts-ignore`.

## Review Standards

All Pull Requests require:
1. At least one approval from a code owner.
2. Passing CI pipeline (Lint, Typecheck, Tests, Build).
3. No decrease in test coverage.

## Developer Troubleshooting

See [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) for common environment issues.
