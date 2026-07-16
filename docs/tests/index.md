# Testing Documentation

Quality is paramount at Birth Voices Hub. This document details our testing strategies and tools.

## Testing Layers

1. **Unit Tests (Vitest)**
   - Located in `__tests__/unit/`.
   - Focus: Isolated functions, utilities, and business logic (Services).
   - Mocking: External dependencies (APIs, Database) MUST be mocked. Use `vitest-mock-extended` for Prisma.

2. **Integration Tests (Vitest)**
   - Located in `__tests__/integration/`.
   - Focus: API endpoints, middleware (Auth/RBAC), and Database interactions.
   - Mocking: Do NOT mock the database. Use a real, isolated test database instance.

3. **E2E / Frontend Tests (Playwright - Planned)**
   - Focus: Full user journeys in the browser.
   - Execution: Requires the full stack to be running locally or in a staging environment.

4. **Load & Performance Tests (k6)**
   - A basic `k6-load-test.js` script is provided in the root directory.
   - Run: `k6 run k6-load-test.js`
   - Focus: Ensuring the API can handle expected concurrency limits.

## Execution Guide

### Local Execution

```bash
# Run all tests (unit and integration)
npm run test

# Run tests with coverage report
npm run test -- --coverage

# Run tests in watch mode
npm run test -- --watch
```

### CI Execution

The test suite runs automatically via GitHub Actions on every Pull Request and push to `main`.
The CI pipeline handles setting up the test database, running migrations, executing tests, and uploading coverage reports.

## Fixtures and Setup

- Test setup files are located in `vitest.setup.ts`.
- Ensure your local test database is clean before running integration tests. The test runner handles resetting specific tables between tests if necessary, but starting from a clean state is recommended.
