# LuchoAI — Code Review Action Plan

---

## Multi-Provider AI Feature (branch `claude/multi-provider-ai-selection-1pqlo6`)

This section summarises the changes introduced by the multi-provider AI selection feature.

### What changed

- `src/types/index.ts` — Added `AIProvider` union type and `AIProviderConfig` interface
- `src/lib/providers.ts` — New file: provider + model registry (Anthropic, OpenAI, Gemini, Hugging Face)
- `src/lib/storage.ts` — Added `getProviderConfig` / `setProviderConfig` / `clearProviderConfig`; legacy `luchoai_api_key` is still read as a fallback for backwards compatibility
- `src/lib/claude.ts` — Replaced single-provider Anthropic client with a unified multi-provider dispatcher; public API signature changed from `(apiKey, ...)` to `(providerConfig, ...)`
- `src/components/ApiKeySetup.tsx` — Replaced simple key input with provider + model selector UI
- `src/components/CoachChat.tsx`, `TrainingPlan.tsx` — Props updated from `apiKey: string` to `providerConfig: AIProviderConfig`
- `src/app/coach/page.tsx`, `training/page.tsx`, `profile/page.tsx` — State migrated from `apiKey` to `providerConfig`; coach page gains a "Switch" button
- `src/__tests__/storage.test.ts`, `claude.test.ts` — Tests updated and expanded for all four providers
- `.github/workflows/ci.yml` — Secrets scan extended to cover OpenAI and Hugging Face key patterns
- `README.md` — Updated with provider table and revised architecture section

### New dependency surface

Three new browser-compatible SDKs are added:

| Package | Version | Notes |
|---|---|---|
| `openai` | latest | `dangerouslyAllowBrowser: true` required |
| `@google/generative-ai` | latest | No extra flags needed for browser use |
| `@huggingface/inference` | latest | Uses `chatCompletion` — requires models that support the Messages API |

### Storage migration

`getProviderConfig()` reads `luchoai_provider_config` first. If absent it falls back to `luchoai_api_key` and returns a synthetic Anthropic config, so existing users are not logged out on upgrade.

### Areas to watch

- **CORS for Hugging Face**: some HF model endpoints enforce origin restrictions in certain regions; users may see network errors on models that do not support browser-direct inference. Mitigation: document this in the UI or add a proxy option in a future iteration.
- **Key validation for Gemini**: the current check is `key.length > 20`, which is intentionally permissive because Google AI Studio keys do not follow a fixed prefix. A more precise check could be added once the key format stabilises.
- **Model IDs drift**: provider model IDs are hardcoded in `providers.ts`. If providers rename or deprecate models the hardcoded IDs will silently fail at runtime. Consider fetching the model list dynamically or adding a fallback error message.

---

Generated from engineering manager review of branch `claude/claude-md-docs-mmeq4j`.
Work through sections in order: Critical → Major → Minor.

---

## Legend

- `[ ]` — not started
- `[~]` — in progress
- `[x]` — done

---

## Critical Issues

### C1 · Deploy not gated on CI passing

**File:** `.github/workflows/deploy.yml`
**Problem:** `deploy.yml` triggers on `push` to `main` independently of `ci.yml`. The two workflows run in parallel — a commit that fails lint, tests, or build will still deploy successfully.
**Fix:** Add `needs: [lint-and-build, test, security]` on the deploy job, or merge deploy into `ci.yml` as a final gated stage.

**Verification:**
- [x] `deploy.yml` now triggers on `workflow_run` from CI, with `if: conclusion == 'success'` guard
- [ ] Push a deliberate lint error to `main` and confirm the deploy job does not run
- [ ] Push a clean commit and confirm deploy runs only after all CI jobs are green

---

### C2 · Unbounded chat history causes context-window exhaustion

**File:** `src/components/CoachChat.tsx` line 57, `src/lib/claude.ts` lines 17–21
**Problem:** Every message in the session is forwarded to the Anthropic API on every request. A long coaching session will eventually exceed the model's context window and fail with an unrecoverable API error.
**Fix:** In `sendMessage` (or before calling it in `CoachChat`), pass only the last N messages — e.g., the last 20 — as context. Keep the full history in component state for display purposes only.

**Tests to add** (`src/__tests__/claude.test.ts`):
- [x] When `history` contains more than 20 messages, `sendMessage` only includes the last 20 in the API request body
- [x] Error from the API is caught and propagates as a rejected promise with a user-readable message

---

### C3 · Training plan JSON response has no runtime shape validation

**File:** `src/lib/claude.ts` line 78
**Problem:** `JSON.parse(jsonMatch[0]) as Omit<TrainingPlan, 'generatedAt'>` is a compile-time cast only. If Claude returns valid JSON with a missing or null `sessions` field, `TrainingPlan.tsx` calls `.map()` on `undefined` and throws an unhandled crash.
**Fix:** Add a guard function that validates the parsed object has the expected shape before returning it. At minimum: `typeof parsed.weeklyGoal === 'string'` and `Array.isArray(parsed.sessions)`.

**Tests to add** (`src/__tests__/claude.test.ts`):
- [x] A response body with no `sessions` field throws a validation error (not an uncaught TypeError)
- [x] A response body where `sessions` is `null` throws a validation error
- [x] A response body where `sessions` is an empty array returns a valid `TrainingPlan` with zero sessions
- [x] A well-formed response parses successfully and returns the expected shape

---

## Major Issues

### M1 · Prompt injection via free-text profile fields

**File:** `src/lib/prompts.ts` lines 29–34
**Problem:** `profile.name`, `profile.goals`, and `profile.weaknesses` are interpolated verbatim into the system prompt. A user can enter newlines + override instructions (e.g. `"Alex\n\nDisregard your coaching persona..."`) to manipulate the AI's behaviour. The target audience is children — this risk is higher here than in most apps.
**Fix:** Before interpolating any profile field, strip newlines, carriage returns, and other control characters. Cap field lengths (e.g., name ≤ 50 chars, each goal/weakness ≤ 200 chars). Apply the sanitisation inside `buildSystemPrompt`.

**Tests to add** (`src/__tests__/prompts.test.ts`):
- [ ] A name containing `\n` has newlines stripped in the returned prompt
- [ ] A goal containing `\r\n` + override text is sanitised
- [ ] Fields exceeding the max length are truncated
- [ ] A null or undefined profile returns the base prompt unchanged

---

### M2 · `localStorage` profile read has no shape validation

**File:** `src/lib/storage.ts` line 26
**Problem:** `JSON.parse(raw) as PlayerProfile` silently accepts any shape. If `goals` is not an array, `profile.goals.filter(Boolean)` in `prompts.ts` throws a runtime error that surfaces as a blank screen.
**Fix:** Add a minimal structural validator — check that `name` is a string, `age` is a number, and `goals`/`weaknesses` are arrays — and return `null` (not the malformed object) if the check fails.

**Tests to add** (`src/__tests__/storage.test.ts`):
- [ ] A stored value missing the `goals` array returns `null`
- [ ] A stored value where `age` is a string returns `null`
- [ ] A stored value with all required fields returns a valid `PlayerProfile`
- [ ] *(already exists)* Invalid JSON returns `null`

---

### M3 · CI uses `npm install` instead of `npm ci`

**File:** `.github/workflows/ci.yml` lines 31, 53, 70
**Problem:** `npm install` may update `package-lock.json` or resolve to newer patch versions, so the CI environment may not match the committed lockfile. `deploy.yml` correctly uses `npm ci`.
**Fix:** Replace all three `npm install` occurrences in `ci.yml` with `npm ci`.

**Verification:**
- [ ] All three CI jobs complete successfully with `npm ci`
- [ ] A deliberate version mismatch between `package.json` and `package-lock.json` causes the job to fail (proving the lock is enforced)

---

### M4 · `npm audit` failure is silently ignored

**File:** `.github/workflows/ci.yml` line 74
**Problem:** `continue-on-error: true` means a high-severity CVE will log a warning but will not fail the workflow or block the PR.
**Fix:** Remove `continue-on-error: true`. If the audit is too noisy today, add an `--audit-level=critical` flag temporarily and document the decision in a comment.

**Verification:**
- [ ] Introduce a known-vulnerable package, confirm the security job fails and blocks the PR
- [ ] Remove it, confirm the job passes

---

### M5 · React key collision via `Date.now() + 1` hack

**File:** `src/components/CoachChat.tsx` lines 45, 61
**Problem:** Two `Date.now()` calls within the same millisecond produce duplicate React keys. The `+ 1` offset is a fragile workaround that fails under fast renders.
**Fix:** Replace with `crypto.randomUUID()`, which is available in all modern browsers and in the Next.js runtime.

**Tests to add** (`src/__tests__/CoachChat.test.tsx`):
- [ ] Sending two messages in rapid succession produces no React key-collision console warning
- [ ] Each `Message` object created by the send handler has a unique `id`

---

### M6 · Form labels not associated with inputs

**File:** `src/components/PlayerProfile.tsx`
**Problem:** Six `<label>` elements have no `htmlFor` attribute, and their inputs have no `id`. Screen readers cannot associate label text with the control. (`ApiKeySetup.tsx` gets this right — follow that pattern.)
**Fix:** Add `id` + `htmlFor` pairs to every label/input pair. Use stable IDs for static fields (`name`, `age`, `position`, `skillLevel`) and indexed IDs for dynamic list inputs (`goal-0`, `goal-1`, `weakness-0`, etc.).

**Tests to add** (`src/__tests__/PlayerProfile.test.tsx`):
- [ ] Clicking each label programmatically focuses its associated input
- [ ] All inputs are reachable via keyboard Tab in logical order

---

### M7 · Dead MCP entries reference unused services

**File:** `.mcp.json`
**Problem:** `postgres` and `slack` server entries are declared but this app has no database and no Slack integration. They reference credential env vars in a committed, public file, creating unnecessary attack surface.
**Fix:** Remove the `postgres` and `slack` entries entirely.

**Verification:**
- [ ] `validate-config` CI job still passes after removal
- [ ] No other file references `DATABASE_URL` or `SLACK_BOT_TOKEN`

---

## Minor Issues

### m1 · Colour contrast fails WCAG AA

**Files:** `src/components/ApiKeySetup.tsx:65`, `src/components/MessageBubble.tsx:25`, `src/app/page.tsx` (CTA button)
**Problem:** Three combinations fail the 4.5:1 ratio required for normal/small text:
- `gray-400` on white = **2.54:1** (hint text in `ApiKeySetup`, timestamp in `MessageBubble`)
- `pitch-dark` (#0f5a2b) on `gold` (#f59e0b) = **3.88:1** (training plan CTA)
- `green-200` on `pitch-green` bubble = **3.95:1** (user message timestamp)

**Fix:** Use `gray-600` instead of `gray-400` for hint text; darken the gold-button text or lighten the gold; use `text-white` for the user bubble timestamp.

**Tests to add:**
- [ ] Visual regression / Storybook snapshot for each affected component

---

### m2 · `WELCOME` timestamp frozen at module load time

**File:** `src/components/CoachChat.tsx` line 18
**Problem:** `WELCOME` is defined at module level, so `timestamp: new Date()` is evaluated once on first import. Navigating between pages without a full reload will show a stale time in the welcome bubble.
**Fix:** Move `new Date()` inside `buildWelcome()` so it evaluates at component mount time.

**Tests to add** (`src/__tests__/CoachChat.test.tsx`):
- [ ] The welcome message timestamp is within 1 second of `Date.now()` when the component mounts

---

### m3 · Array index used as React key in dynamic lists

**Files:** `src/components/TrainingPlan.tsx` lines 79, 87; `src/components/PlayerProfile.tsx` lines 119, 140
**Problem:** Index keys work while items are only added but break if items are ever reordered or deleted — incorrect DOM reconciliation and input focus loss.
**Fix:** Assign stable IDs to drills and coaching points at creation time (e.g., from the plan JSON), and to goal/weakness entries when they are added to the list.

---

### m4 · No `aria-live` region during AI loading

**File:** `src/components/CoachChat.tsx` lines 80–90
**Problem:** Screen reader users receive no feedback when the coach is generating a response.
**Fix:** Add a visually-hidden `<div aria-live="polite" aria-atomic="true">` that renders "Coach is typing…" when `loading` is `true` and is empty otherwise.

**Tests to add:**
- [ ] The live region text changes to a non-empty string when `loading` becomes `true`
- [ ] The live region text returns to empty when `loading` becomes `false`

---

### m5 · No `npm` cache in CI jobs

**File:** `.github/workflows/ci.yml` — all three `setup-node` steps
**Problem:** `deploy.yml` correctly sets `cache: 'npm'`. The three CI jobs do not, so they each download all dependencies from the network on every run.
**Fix:** Add `cache: 'npm'` to each `actions/setup-node` step in `ci.yml`.

---

### m6 · `setTimeout` leaks on unmount in Profile page

**File:** `src/app/profile/page.tsx` line 46
**Problem:** A 3-second `setTimeout` is set with no cleanup. If the user navigates away within 3 seconds, `setSaved(false)` is called on an unmounted component.
**Fix:** Return a cleanup function that calls `clearTimeout` — either by wrapping the save logic in a `useEffect`, or by storing the ID in a `useRef` and clearing it on unmount.

**Tests to add** (`src/__tests__/profile.test.tsx`):
- [ ] Unmounting the component before the timeout fires produces no React state-update warning

---

### m7 · Chat page uses `<div>` instead of `<main>` with inline style

**File:** `src/app/coach/page.tsx` line 31
**Problem:** The chat wrapper uses a `<div>` with an inline `style` prop (violates no-inline-styles rule and encodes a magic number). Both `training/page.tsx` and `profile/page.tsx` correctly use `<main>`.
**Fix:** Replace with `<main className="flex-1 max-w-2xl mx-auto w-full bg-white shadow-sm flex flex-col overflow-hidden">` and use a Tailwind arbitrary value (`h-[calc(100vh-3.5rem)]`) rather than an inline style.

---

### m8 · Model ID duplicated as a string literal

**File:** `src/lib/claude.ts` lines 23, 41
**Problem:** `'claude-opus-4-8'` appears twice with no constant. CLAUDE.md already says "edit in `claude.ts` to change the model" — enforce single-point-of-change with a named constant. Also verify this is the correct model identifier.
**Fix:** `const MODEL_ID = 'claude-opus-4-8' as const;` at the top of the file; use it in both `create` calls.

---

### m9 · `playwright` dependency with no E2E tests or config

**File:** `package.json`
**Problem:** `playwright` is listed in `devDependencies` with no Playwright config, no test files, and no CI step that runs it.
**Fix (option A):** Add an E2E test for the two highest-value paths: landing page loads, and the coach chat sends a message (mocked). Add a `test:e2e` npm script and a `e2e` CI job.
**Fix (option B):** Remove `playwright` from `devDependencies` until E2E tests are planned.

**Tests to add (if option A)** (`e2e/home.spec.ts`, `e2e/coach.spec.ts`):
- [ ] Landing page loads, hero text is visible
- [ ] Navigating to `/coach` without an API key shows the `ApiKeySetup` screen
- [ ] Entering a valid key stores it and reveals the chat interface

---

### m10 · Secrets scan misses non-JS file types

**File:** `.github/workflows/ci.yml` line 78
**Problem:** The `grep` includes only `*.ts`, `*.tsx`, `*.js`. Keys committed to `.json`, `.yml`, `.yaml`, `.md`, or `.env*` files would not be caught.
**Fix:** Add `--include='*.json' --include='*.yml' --include='*.yaml' --include='*.md'`, or replace the manual grep with a dedicated tool such as `gitleaks` or `trufflesecurity/trufflehog`.

---

### m11 · Three pages share identical bootstrap logic

**Files:** `src/app/coach/page.tsx`, `src/app/training/page.tsx`, `src/app/profile/page.tsx`
**Problem:** Each page contains the same ~18-line block: `useEffect` + `getApiKey` + `getPlayerProfile` + `setReady` guard + `<ApiKeySetup>` fallback. Any change (e.g., adding a "change key" button) requires three identical edits.
**Fix:** Extract a `useAppState()` hook that returns `{ apiKey, playerProfile, ready }` and a `WithAuth` wrapper component that handles the `ApiKeySetup` fallback.

**Tests to add** (`src/__tests__/useAppState.test.ts`):
- [ ] Returns `ready: false` before the effect fires
- [ ] Returns `apiKey: null` and `playerProfile: null` when nothing is stored
- [ ] Returns stored values after `localStorage` is populated

---

### m12 · Chat input missing `aria-label`

**File:** `src/components/CoachChat.tsx` line 96
**Problem:** The text input has a `placeholder` but no `aria-label` or `aria-labelledby`. Placeholder text alone is insufficient for accessibility.
**Fix:** Add `aria-label="Message your coach"` to the input element.

---

## Testing Gaps Summary

Files where test coverage should be added or expanded:

| File | Tests needed |
|------|--------------|
| `src/__tests__/storage.test.ts` | Shape validation for malformed profiles (M2) |
| `src/__tests__/claude.test.ts` | New file — history truncation (C2), JSON validation (C3) |
| `src/__tests__/prompts.test.ts` | New file — prompt injection sanitisation (M1) |
| `src/__tests__/CoachChat.test.tsx` | New file — key uniqueness (M5), welcome timestamp (m2), aria-live (m4) |
| `src/__tests__/PlayerProfile.test.tsx` | New file — label/input associations (M6) |
| `src/__tests__/profile.test.tsx` | New file — setTimeout cleanup (m6) |
| `src/__tests__/useAppState.test.ts` | New file — shared hook (m11) |
| `e2e/` | New dir — landing page, coach auth flow, chat send (m9, if E2E chosen) |

---

## Progress Tracker

| ID | Severity | Status | Owner |
|----|----------|--------|-------|
| C1 | Critical | `[x]` | |
| C2 | Critical | `[x]` | |
| C3 | Critical | `[x]` | |
| M1 | Major | `[ ]` | |
| M2 | Major | `[ ]` | |
| M3 | Major | `[ ]` | |
| M4 | Major | `[ ]` | |
| M5 | Major | `[ ]` | |
| M6 | Major | `[ ]` | |
| M7 | Major | `[ ]` | |
| m1 | Minor | `[ ]` | |
| m2 | Minor | `[ ]` | |
| m3 | Minor | `[ ]` | |
| m4 | Minor | `[ ]` | |
| m5 | Minor | `[ ]` | |
| m6 | Minor | `[ ]` | |
| m7 | Minor | `[ ]` | |
| m8 | Minor | `[ ]` | |
| m9 | Minor | `[ ]` | |
| m10 | Minor | `[ ]` | |
| m11 | Minor | `[ ]` | |
| m12 | Minor | `[ ]` | |
