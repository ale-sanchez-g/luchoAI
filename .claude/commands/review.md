# /project:review

Review the current branch diff for correctness, style, and security issues.

## Steps

1. Run `git diff main...HEAD` to get the full diff.
2. Check against `.claude/rules/code-style.md` for style violations.
3. Check against `.claude/rules/api-conventions.md` for API issues.
4. Look for security vulnerabilities: SQL injection, XSS, exposed secrets, insecure dependencies.
5. Summarise findings as a prioritised list:
   - **Critical**: Must fix before merge.
   - **Warning**: Should fix.
   - **Suggestion**: Nice to have.

## Arguments

- `$ARGUMENTS` — optional file path to scope the review to a single file.
