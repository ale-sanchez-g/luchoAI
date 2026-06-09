---
description: Generate and run tests following this project's testing patterns.
triggers:
  - write tests
  - add tests
  - test coverage
  - unit test
  - integration test
---

# Testing Patterns Skill

When asked to write tests, follow these conventions:

## Framework

- Use **Jest** (or the test runner configured in `package.json`).
- Place test files adjacent to source files as `*.test.ts`.
- Use `describe` blocks to group related tests.
- Use `it` (not `test`) for individual cases.

## Structure

```ts
describe('ComponentName', () => {
  beforeEach(() => {
    // setup
  });

  it('should do X when Y', () => {
    // arrange
    // act
    // assert
  });
});
```

## Coverage Goals

- Aim for 80%+ line coverage on business logic.
- Always test error paths, not just happy paths.
- Mock external services (DB, HTTP) — never call them in unit tests.

## Running Tests

```bash
npm test              # run all tests
npm test -- --watch  # watch mode
npm test -- --coverage  # with coverage report
```
