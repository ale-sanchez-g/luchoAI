# Code Style Rules

## General

- Use 2-space indentation.
- Maximum line length: 100 characters.
- Use single quotes for strings (unless the string contains a single quote).
- Always add a trailing newline at end of file.
- No trailing whitespace.

## Naming Conventions

- Variables and functions: `camelCase`
- Classes, types, interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case.ts` (except Next.js conventions: `page.tsx`, `layout.tsx`, `globals.css`)
- React components: `PascalCase.tsx`

## TypeScript

- Prefer `interface` over `type` for object shapes.
- Always type function parameters and return values explicitly.
- **Exception**: React component return types — omit the return type annotation and let TypeScript
  infer it. React 19 removed `JSX` from the global namespace; explicit return types on components
  require `import type { JSX } from 'react'` on every file, which adds noise without benefit.
- Avoid `any` — use `unknown` and narrow instead.
- Prefer `const` over `let`; never use `var`.
- Use named imports from `react` for types: `import type { ReactNode } from 'react'`.

## React / Next.js

- Mark client components with `'use client'` only when hooks or browser APIs are required.
- No `useEffect` for data that can be derived from props or state.
- Avoid inline styles; prefer Tailwind utility classes.

## Comments

- Only comment the *why*, never the *what*.
- No commented-out dead code — delete it.
- JSDoc only on public API surfaces in `src/lib/`.
