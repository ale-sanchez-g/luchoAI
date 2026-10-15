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
    games/page.tsx      # Weekly games + Game IQ decision games (no AI, no API key needed)
    wellbeing/page.tsx  # Wellbeing check-in, reset tools, helplines (no AI, no API key needed)
    profile/page.tsx    # Player profile setup
  components/
    Header.tsx          # Navigation bar
    Icon.tsx            # Leaf icon (<img> from public/icons) used instead of emojis
    CoachChat.tsx       # Main AI chat interface
    MessageBubble.tsx   # Individual chat message bubble
    TrainingPlan.tsx    # Training plan display + generator
    PlayerProfile.tsx   # Player profile form
    ApiKeySetup.tsx     # First-run Anthropic API key entry
    GamesHub.tsx        # Games page tabs: This week | Game IQ
    WeeklyGames.tsx     # This week's games, twist, match mission and Game IQ round of the week
    DecisionGame.tsx    # Game IQ: theme picker, scenarios, round summary
    PitchDiagram.tsx    # SVG pitch used by decision scenarios + legend
    WellbeingCheckIn.tsx  # Daily mood + life-balance check-in and history
    BreathingExercise.tsx # Guided breathe-in-4 / breathe-out-6 pacer
  lib/
    claude.ts           # Anthropic SDK client (sendMessage, generateTrainingPlan)
    prompts.ts          # System prompts (incl. chat scope rules) and player profile injection
    guardrails.ts       # Chat screens: off-topic/override requests in, code out
    icons.ts            # ICON_NAMES / IconName for the files in public/icons
    use-visual-viewport-height.ts  # Sets --app-height to the visible screen (iPhone keyboard)
    storage.ts          # localStorage helpers (apiKey, playerProfile, check-ins, game scores)
    decision-games.ts   # Game IQ scenarios + on-pitch games (static content)
    game-library/       # Weekly game library (see docs/game-library.md)
      index.ts          #   GAME_LIBRARY, getWeeklyPlan, getLibraryStats
      rotation.ts       #   Deterministic weekly plan (focus, slots, twists, mission)
      skills.ts         #   14 skill areas + matching a player's own goal wording
      safety.ts         #   Banned phrases, the no-heading rule and the derived "stay safe" notes
      twists.ts         #   Rule changes that make each game feel new
      no-twists.ts      #   Named sets of twist kinds a game can opt out of
      missions.ts       #   Match missions (process goals for a real game)
      games/*.ts        #   One file of games per skill area
    wellbeing.ts        # Wellbeing content, helplines, check-in validation, support nudge
  types/
    index.ts            # PlayerProfile, Message, TrainingPlan, Drill interfaces
  __tests__/
    storage.test.ts     # Unit tests for storage utilities
    game-library.test.ts   # Content gates: safety, kindness, size, coverage, ways to play
    game-rotation.test.ts  # Weekly rotation engine
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
- Free questions: the deploy workflow passes the `GEMINI_FREE_API_KEY` repo secret to the build; `next.config.ts` bakes it in lightly obfuscated (`src/lib/free-key.ts`), and `ApiKeySetup.tsx` shows a "Try 5 free questions" button only when a key was baked in. This is NOT secure storage: anyone can read the key in their browser, and the 5-question count lives in `localStorage`. Restrict the key to the site's HTTP referrer and set a low quota in Google AI Studio
- Free training plans: 2 per browser, counted apart from the 5 questions (`FREE_PLAN_LIMIT`). They use the same baked-in Gemini key but always run on the cheapest model, `FREE_PLAN_MODEL` in `providers.ts` (`gemini-3.5-flash-lite`)
- The API key is entered by the user via `ApiKeySetup.tsx` and stored in `localStorage` — it is only ever sent to Anthropic, never anywhere else
- Chat guardrails: the coach only talks football. The main layer is the "Staying on topic" rules in `BASE_SYSTEM_PROMPT` (no code, creative writing, homework or other subjects; never reveal its instructions; wellbeing rules come first). `src/lib/guardrails.ts` adds checks inside `sendMessage`: clear-cut off-topic or "ignore your instructions" messages get a canned redirect without calling the provider (no free question spent), and a reply containing code is swapped for the redirect. Profile fields are flattened and length-capped before they enter the system prompt. Anyone can reword past a pattern, so keep patterns tight: a false positive tells a child their football question is off-topic. `guardrails.test.ts` runs every pattern over the app's own football text

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
- No emojis in the UI or data: use `<Icon name="…" />` (source art in `iconography/leaf`, served copy in `public/icons`, kept identical by `Icon.test.tsx`). Data fields hold an `IconName`, not an emoji. Use icons at 28px or larger
- Coach chat layout: the page is one fixed-height column (`h-[var(--app-height,100dvh)]`, `min-h-0` on the panels) so only the message list scrolls and the header and message box stay on screen. Never use `scrollIntoView` or `100vh` there, keep the message box at 16px (`text-base`) or iPhones zoom in, and test at 375×667 and 320×568 (`CoachChat.test.tsx` guards the causes)
- Wellbeing check-ins are sensitive data about children: keep them in `localStorage` only and never include them in AI prompts or send them anywhere
- Helpline numbers in `src/lib/wellbeing.ts` were verified on 2026-10-13 — re-verify against the official sites before changing them
- Game library content (`src/lib/game-library`) is for children playing without a coach: follow `docs/game-library.md`. There are deliberately no heading games, no elimination, no exercise as a penalty and no outcome-based match missions; `game-library.test.ts` enforces these, so don't loosen the rules to make a game pass. A new game also needs `noTwists` for any kind of twist that would contradict it (a game with no roles opts out of `roles`, a game with no score of `scoring`)
- Write game text in your own words. Game ideas are free to reuse, but federation and coaching-site wording, diagrams and branded names (see docs/game-library.md) are not
- The `basePath` in `next.config.ts` is controlled by `NEXT_PUBLIC_BASE_PATH` env var — empty locally, `/luchoAI` in CI
