# Project Overview

Briefly describe what this project does, its purpose, and the problem it solves.

## Tech Stack

- **Language**: e.g. TypeScript / Python / Go
- **Framework**: e.g. Next.js / FastAPI / Gin
- **Database**: e.g. PostgreSQL / MongoDB
- **Infrastructure**: e.g. AWS / GCP / Docker

## Architecture

Describe the high-level architecture. Include key directories and what they contain.

```
src/
  api/        # API route handlers
  services/   # Business logic
  models/     # Data models / DB schemas
  utils/      # Shared utilities
tests/        # Test suites
```

## Coding Conventions

- Follow the rules in `.claude/rules/` for style and API conventions.
- All PRs must pass linting and tests before merge.
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## Key Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

## Notes for Claude

- Always run tests after making changes.
- Do not commit secrets or `.env` files.
- Prefer editing existing files over creating new ones.
