# LuchoAI — AI Football Coach

LuchoAI is an AI-augmented coaching platform that helps young football (soccer) players aged 8–18 reach their full potential. It delivers personalized training plans, technical skill guidance, tactical advice, and motivational coaching powered by Claude AI.

## Tech Stack

- **Language**: TypeScript
- **Framework**: Next.js 15 (App Router, static export)
- **Styling**: Tailwind CSS v3
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`, client-side via user-supplied key)
- **Infrastructure**: GitHub Pages (static hosting via GitHub Actions)

## Architecture

Fully static Next.js site. No server — all AI calls happen from the browser using the player's Anthropic API key stored in `localStorage`. The static export (`out/`) is deployed to GitHub Pages on every push to `main`.

```
src/
  app/                  # Next.js App Router
    page.tsx            # Landing page
    layout.tsx          # Root layout + metadata
    globals.css         # Tailwind base styles
    coach/page.tsx      # AI coaching chat
    training/page.tsx   # Training plan generator
    profile/page.tsx    # Player profile setup
  components/
    Header.tsx          # Navigation bar
    CoachChat.tsx       # Main AI chat interface
    MessageBubble.tsx   # Individual chat message bubble
    TrainingPlan.tsx    # Training plan display + generator
    PlayerProfile.tsx   # Player profile form
    ApiKeySetup.tsx     # First-run Anthropic API key entry
  lib/
    claude.ts           # Anthropic SDK client (sendMessage, generateTrainingPlan)
    prompts.ts          # System prompts and player profile injection
    storage.ts          # localStorage helpers (apiKey, playerProfile)
  types/
    index.ts            # PlayerProfile, Message, TrainingPlan, Drill interfaces
  __tests__/
    storage.test.ts     # Unit tests for storage utilities
    __mocks__/
      styleMock.ts      # CSS module mock for Jest
.github/
  workflows/
    ci.yml              # Lint + build on every push
    deploy.yml          # Deploy to GitHub Pages on push to main
```

## Key Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build static export (output → out/)
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## GitHub Pages Deployment

1. Go to repo **Settings → Pages → Source** and select **GitHub Actions**
2. Push to `main` — the `deploy.yml` workflow builds and deploys automatically
3. The live URL will be `https://ale-sanchez-g.github.io/luchoAI/`

The build sets `NEXT_PUBLIC_BASE_PATH=/luchoAI` so all asset paths resolve correctly under the subpath.

## Environment Variables

No server-side secrets. The app is fully client-side.

For local development, create `.env.local` (gitignored):

```
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...   # pre-fills the API key setup screen
NEXT_PUBLIC_BASE_PATH=                      # leave empty for local dev
```

## AI Integration

- `src/lib/claude.ts` — wraps `@anthropic-ai/sdk` for browser use (`dangerouslyAllowBrowser: true`)
- `src/lib/prompts.ts` — defines the LuchoAI coaching persona and injects the player profile into the system prompt
- Model: `claude-opus-4-8` — edit in `claude.ts` to adjust cost vs quality
- The API key is entered by the user via `ApiKeySetup.tsx` and stored in `localStorage` — it is only ever sent to Anthropic, never anywhere else

## Coding Conventions

- Follow the rules in `.claude/rules/` for style and API conventions
- All PRs must pass lint and build before merge
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Target audience is children aged 8–18 — language in UI and AI prompts must be encouraging, positive, and age-appropriate

## Notes for Claude

- Always run `npm run build` after changes to catch static-export issues (no dynamic routes, no server-side API routes)
- Never commit `.env.local` or API keys
- The coaching persona lives in `src/lib/prompts.ts` — edit `BASE_SYSTEM_PROMPT` to tune tone and coaching focus
- Prefer editing existing components over creating new ones
- All AI calls must have error handling with user-friendly messages shown in the UI
- `next/image` requires `unoptimized: true` in `next.config.ts` for static export — do not remove that config
- The `basePath` in `next.config.ts` is controlled by `NEXT_PUBLIC_BASE_PATH` env var — empty locally, `/luchoAI` in CI
