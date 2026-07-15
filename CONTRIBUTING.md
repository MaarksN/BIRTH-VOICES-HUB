# Contributing to Birth Voices Hub

We welcome contributions! To ensure a smooth process, please follow the guidelines outlined below.

## Git Workflow

We use a feature-branch workflow. All changes should be made in feature branches and merged via Pull Requests.

1. **Branch Naming**:
   - `feature/description`
   - `fix/description`
   - `docs/description`
   - `chore/description`
   - `refactor/description`

2. **Commit Messages**:
   We strictly follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
   Examples:
   - `feat(auth): add JWT refresh token rotation`
   - `fix(ui): resolve overflow issue on mobile`
   - `docs(api): update swagger spec for users endpoint`

3. **Pull Requests**:
   - Ensure your code passes all CI checks (`npm run test`, `npm run lint`, `npm run typecheck`).
   - Fill out the PR template.
   - Require at least one approval from a code owner.

## Development Standards

- **TypeScript**: We enforce strict typing. Do not use `any`, `@ts-ignore`, or `@ts-expect-error`. Fix the root cause.
- **Architecture**: Follow the Clean Architecture principles established in the repository. Do not bypass the Controller -> Service -> Repository flow.
- **Testing**: All new features require unit and integration tests.

For more details on local development, see [DEVELOPMENT.md](./DEVELOPMENT.md).
