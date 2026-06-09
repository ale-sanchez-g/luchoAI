# Pull Request Rules

## Before Opening a PR

- All tests must pass locally.
- No linting errors.
- No new `console.log` statements left in code.
- `.env` or secrets must never be committed.

## PR Title

Use conventional commit format:
```
feat(scope): short description
fix(scope): short description
chore(scope): short description
```

## PR Description Template

```markdown
## Summary
- What does this PR do?

## Changes
- List key changes

## Test Plan
- [ ] Unit tests added/updated
- [ ] Manual testing steps described

## Screenshots (if UI change)
```

## Review Etiquette

- Keep PRs small — under 400 lines changed where possible.
- Respond to all review comments before requesting re-review.
- Squash commits before merging.
