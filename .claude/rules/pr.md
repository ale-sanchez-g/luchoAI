# Pull Request Rules

## Before Opening a PR

- `npm run lint` must pass with zero errors.
- `npm run build` must succeed (catches static-export issues).
- `npm test` must pass.
- No new `console.log` statements left in code.
- `.env.local` or any file containing `sk-ant-` keys must never be committed.

## PR Title

Use conventional commit format:
```
feat(scope): short description
fix(scope): short description
chore(scope): short description
```

Scopes: `coach`, `training`, `profile`, `ui`, `ci`, `docs`, `deps`

## PR Description Template

```markdown
## Summary
- What does this PR do?

## Changes
- List key changes

## Test Plan
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Manually tested in browser
- [ ] AI interactions tested end-to-end (if touching claude.ts or prompts.ts)

## Screenshots (if UI change)
```

## Review Etiquette

- Keep PRs small — under 400 lines changed where possible.
- Respond to all review comments before requesting re-review.
- Squash commits before merging.
