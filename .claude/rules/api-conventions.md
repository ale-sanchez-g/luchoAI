# API Conventions

## Architecture Note

LuchoAI is a fully static site (Next.js static export for GitHub Pages). There are **no server-side API routes**. All external calls go directly from the browser to the Anthropic API.

## Anthropic API Usage

- All Claude API calls live in `src/lib/claude.ts`
- Use `dangerouslyAllowBrowser: true` on the Anthropic client (required for browser use)
- Model: `claude-opus-4-8` — change here only, not scattered across files
- Always handle errors with user-friendly messages; never leak raw API errors to the UI
- Max tokens: 1024 for chat, 2048 for training plan generation

## Data Flow

```
User input → Component state → lib/claude.ts → guardrails screen → AI provider
           → guardrails screen → Component state → UI
```

A message the guardrails screen blocks never reaches the provider: `sendMessage` returns the
coach's redirect instead (see `src/lib/guardrails.ts`).

## localStorage Schema

All persistence is via `localStorage` through `src/lib/storage.ts`:

| Key | Type | Purpose |
|-----|------|---------|
| `luchoai_api_key` | `string` | User's Anthropic API key |
| `luchoai_player_profile` | `JSON` | Serialised `PlayerProfile` object |
| `luchoai_wellbeing_checkins` | `JSON` | `WellbeingCheckIn[]`, last 30 days. Sensitive: never send to an AI provider |
| `luchoai_saved_plans` | `JSON` | `SavedPlan[]`, newest first, max 5. A sixth save is refused until the player removes one |
| `luchoai_free_questions_used` | `number` | Free Gemini questions spent (limit 5) |
| `luchoai_free_plans_used` | `number` | Free training plans spent (limit 2) |
| `luchoai_game_scores` | `JSON` | Best Game IQ score per decision theme |

## Error Handling

- Wrap all `claude.ts` calls in try/catch at the component level
- Show inline error messages in the UI — never `alert()` or `console.error` only
- API key validation: check `startsWith('sk-ant-')` before attempting any API call
