# Code Style Rules

## General

- Use 2-space indentation.
- Maximum line length: 100 characters.
- Use single quotes for strings (unless the string contains a single quote).
- Always add a trailing newline at end of file.
- No trailing whitespace.

## Naming Conventions

- Variables and functions: `camelCase`
- Classes and types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case.ts`

## TypeScript

- Prefer `interface` over `type` for object shapes.
- Always type function parameters and return values explicitly.
- Avoid `any` — use `unknown` and narrow instead.
- Prefer `const` over `let`; never use `var`.

## Comments

- Only comment the *why*, never the *what*.
- No commented-out dead code — delete it.
- JSDoc only on public API surfaces.
