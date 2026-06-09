# Claude Code Repository Template

A batteries-included template for projects that use [Claude Code](https://claude.ai/code) as an AI coding assistant.

## What's Included

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Project overview loaded every Claude session |
| `CLAUDE.local.md` | Local/personal overrides (gitignored) |
| `.mcp.json` | MCP server integrations (GitHub, Postgres, Slack) |
| `.claude/settings.json` | Permissions, env vars, hooks |
| `.claude/rules/` | Coding standards Claude must follow |
| `.claude/commands/` | Custom slash commands (`/project:review`, `/project:deploy`) |
| `.claude/skills/` | Auto-triggered skill modules |
| `.claude/agents/` | Specialised sub-agents (`@code-reviewer`, `@security-auditor`) |
| `.claude/hooks/` | Shell hooks that run on tool events |

## Quick Start

1. **Use this template** — click "Use this template" on GitHub.
2. **Edit `CLAUDE.md`** — fill in your project's tech stack, architecture, and conventions.
3. **Configure `.mcp.json`** — remove integrations you don't need; set env vars for those you do.
4. **Review `.claude/settings.json`** — adjust allowed/denied bash commands to match your toolchain.
5. **Customise the rules** — update `.claude/rules/` to match your team's standards.

## Gitignore Recommendations

Add these to your `.gitignore`:

```
CLAUDE.local.md
.claude/settings.local.json
.env
```

## Learn More

- [Claude Code Docs](https://docs.anthropic.com/claude-code)
- [MCP Servers](https://modelcontextprotocol.io)
