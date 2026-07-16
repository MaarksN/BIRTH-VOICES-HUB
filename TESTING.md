# Testing Strategy

We maintain a high standard of quality through rigorous testing. We use Vitest as our primary testing framework for both backend unit and integration tests.

## Test Pyramid

1. **Unit Tests (`__tests__/unit/`)**:
   - Focus on testing isolated functions, utilities, and individual service methods.
   - Dependencies (like Prisma or external APIs) must be mocked.

2. **Integration Tests (`__tests__/integration/`)**:
   - Test the interaction between controllers, services, and the database.
   - We use a test database for integration testing. Do not mock Prisma here.
   - Validates correct routing, middleware execution (RBAC, Auth), and database persistence.

## Running Tests

Execute the entire test suite:
```bash
npm run test
```

Run tests with coverage:
```bash
npm run test -- --coverage
```

Watch mode for active development:
```bash
npm run test -- --watch
```

## Mocking Database in Unit Tests

When writing unit tests for services, mock the repository layer to avoid hitting the actual database. We use `vitest-mock-extended` (or similar manual mocks) for Prisma client mocking in unit tests.

*Note: For integration tests, ensure your local test database is running and migrated.*
