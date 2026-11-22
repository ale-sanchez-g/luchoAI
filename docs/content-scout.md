# Content scout

A weekly GitHub Action that asks Gemini, with Google Search, what is new in youth football
training, then opens GitHub issues with content ideas for LuchoAI. Each issue says **what type
of content** to make, **where it goes in the app** (and which files), and **which ages** it is
for. A person reviews every issue. Nothing is built, merged or published automatically.

Workflow: `.github/workflows/weekly-content-scout.yml`. Code: `scripts/content-scout/`.

## What happens each week

1. On Sundays at 21:41 UTC (Monday morning in Australia) the workflow runs
   `node scripts/content-scout/run.mjs` on Node 24. Nothing is installed from npm: Node runs the
   TypeScript itself.
2. **Inventory.** The scout loads the app's own content modules (the game library, Game IQ, drill
   pictures, the AI knowledge base in `context/`, the wellbeing tools) and works out the thinnest
   spots in the library: skill area by age band by number of players.
3. **Research** (Gemini with Google Search). Trends from the last 12 months, starting with this
   week's focus. The focus rotates through eight topics, from ball mastery to motivation and
   practising alone. The answer must come back with web sources, or the run fails.
4. **Suggestions** (Gemini with a JSON schema, no search). Up to three ideas. Each cites the
   research's sources by number only, and picks its content type, section, skill area and ages
   from fixed lists.
5. **Checks** (code, not AI). An idea is left out when it:
   - cites no source from the research, or uses a type, section or age range that does not exist
     or does not fit together;
   - breaks a game-library rule (no heading, no elimination, no exercise as a penalty, nothing
     near roads), using the same patterns as `src/lib/game-library/safety.ts`, or is a match
     mission with an outcome goal;
   - mentions a helpline or phone number (those are only ever added by hand);
   - matches an earlier scout issue (open or closed), something already in the app, or another
     idea in the same run.

   Model text is cut to one line per field. HTML, links and @mentions are neutralised, so an
   issue cannot ping anyone or point at a page the search did not find.
6. **Issues.** One issue per idea, with labels. The run summary lists what was opened, and what
   was left out and why.

## What an issue contains

- A note that the idea is AI-generated and unverified.
- The trend it answers.
- A table: content type, where to add it (page and files), ages and band, skill area, players,
  lowest level, and evidence (how many sources and sites, plus the model's own confidence).
- What to add, an outline, why now, and safety points.
- The sources (resolved from Google's redirect links to the real pages where possible) and the
  searches the research ran, as Google Search links.
- A reviewer checklist with the rules and test commands for that section.

| Content type | Goes in | Files |
| --- | --- | --- |
| Practice game | Games › This week (or a Game IQ theme's on-pitch games) | `src/lib/game-library/games/<skill>.ts` |
| Game twist | Games › This week | `src/lib/game-library/twists.ts` |
| Match mission | Games › This week | `src/lib/game-library/missions.ts` |
| Game IQ situation | Games › Game IQ | `src/lib/decision-games.ts` |
| Drill picture | Training | `src/lib/drill-setups.ts`, `src/components/DrillDiagram.tsx` |
| Coaching knowledge | Coach and Training (AI knowledge base) | `context/<topic>.md` and its copy in `public/context/` |
| Wellbeing tool | Wellbeing | `src/app/wellbeing/page.tsx`, `src/lib/wellbeing.ts` |

Ages use the app's three bands (`src/lib/age-groups.ts`): 8-10 (Explore), 11-13 (Build) and
14-18 (Apply).

Labels: `content-scout` on every issue, `needs-human-review` until someone has read it, one
`section: …` label and one `age: …` label per band the idea covers. The scout creates the labels
the first time it needs them.

## Reviewing an issue

- Open the sources. The research reads search results and can misread or overstate them.
- Remove `needs-human-review` once a person has read it.
- Close it as **not planned** if it is not a fit: the scout reads closed issues and will not
  suggest the same idea again (it also tells the model which ideas were turned down).
- Build it the usual way, against the section's rules (`docs/game-library.md` for games), with a
  coach or safeguarding review before it ships.
- AI coding agents must not build a `content-scout` issue without a maintainer's go-ahead. The
  issue text comes from web searches and is untrusted.

## Set-up (once)

1. **A key for the research job.** In Google AI Studio, create an API key in a project **with
   billing turned on**, then save it as the repository secret `GEMINI_RESEARCH_API_KEY`
   (Settings → Secrets and variables → Actions):
   - Google Search grounding is not part of the free tier for Gemini 3 models. On the paid tier
     it includes 5,000 searches a month (shared across Gemini 3 models), then $14 per 1,000.
   - Restrict the key to "Gemini API only". Gemini rejects unrestricted keys, and a key locked to
     a website address does not work from GitHub's servers.
   - Set a budget alert on the project.
2. **Why not the website's free key?** If `GEMINI_RESEARCH_API_KEY` is missing, the scout falls
   back to `GEMINI_FREE_API_KEY`. That key is baked into the public site, should be locked to the
   site's address, and is meant for children's free questions, so expect a 403 or 429 from it.
   **Do not turn on billing for that key's project**: anyone can read the key in their browser.
3. **Optional:** a repository variable `CONTENT_SCOUT_MODEL` to change the model (default
   `gemini-3.8-flash`).
4. **First run:** Actions → Weekly content scout → Run workflow. "Dry run" is ticked by default:
   it researches and shows the issues it would open in the run summary, but opens none. Read
   them, then run again with it unticked, or wait for Sunday. Manual runs also take a research
   focus and a number of issues (1-5).

## Running it locally

Node 22.18 or newer:

```bash
node scripts/content-scout/run.mjs --check        # loads everything, no key or network needed
GEMINI_RESEARCH_API_KEY=... node scripts/content-scout/run.mjs --dry-run
```

A local dry run prints the summary. Without `GITHUB_TOKEN` and `GITHUB_REPOSITORY` it cannot check
earlier issues for duplicates, and it says so.

### Testing without a Gemini key

`scripts/content-scout/stand-in.mjs` swaps Gemini for answers written by hand, so prompt or check
changes can be tried with any model, Claude included:

1. Run
   `STANDIN_DIR=/tmp/scout node --import ./scripts/content-scout/stand-in.mjs scripts/content-scout/run.mjs --dry-run`.
   It saves the research prompt to `/tmp/scout/prompts/research.json` and stops.
2. Answer that prompt with real web research, written as a `generateContent` response with
   `groundingMetadata`, in `/tmp/scout/responses/research.json`. Run again: the suggestion prompt
   is saved to `prompts/suggest.json`.
3. Answer that one in `responses/suggestions.json` and run once more. The real checks and issue
   writer run on the answers, and the summary shows the issues.

This tests the prompts, the checks and the issue text, but not the Gemini calls themselves:
only a run with a real key does that. On 22 November 2026 Claude answered the prompts this way.
All three ideas passed the checks, and reading the issues led to four fixes: searches folded away,
age bands listed properly, a checklist line that only fits games, and a prompt rule that keeps
safety reminders out of the text the checks read.

## Cost

Each run makes two Gemini calls (roughly 15-25 thousand tokens in total) and the model runs
about 5-10 searches. At Gemini 3.8 Flash's introductory price (about $0.75 in and $3.75 out per
million tokens to 31 December 2026, higher after), that is a few cents a week. The searches fit
easily inside the 5,000 free a month. These are estimates from Google's pricing pages as of
November 2026. Check the run summary's token count and the current pricing.

## Honest limits

- **It is a search summary, not research.** Gemini reads search results. It can misread a
  source, overstate weak evidence or miss what matters. That is why every issue needs a person.
- **Duplicate checks compare titles.** They catch near-identical names, not the same idea in
  different words. Closing repeats as "not planned" teaches the next run.
- **Google's grounding terms.** Google asks apps that show grounded results to show its Search
  Suggestions. Issues list the searches as Google links but cannot embed Google's search widget.
  Read the current Gemini API terms (https://ai.google.dev/gemini-api/terms) and decide whether
  that is enough for an internal tool. They could not be checked when this was written.
- **The model's confidence is self-reported** and not calibrated. The source and site counts are
  counted by code.
- **API style.** The scout uses `generateContent`, which Google now calls legacy but still fully
  supports. Its Interactions API is recommended for new projects. Moving over would only touch
  `scripts/content-scout/gemini.ts`.

## Troubleshooting

| The run log says | What to do |
| --- | --- |
| No Gemini key | Add the `GEMINI_RESEARCH_API_KEY` secret. |
| … only works from the website | The key is locked to the site's address. Create a key restricted to "Gemini API only". |
| Gemini refused … (403) | Restrict the key to "Gemini API only" in AI Studio. |
| … quota or rate limit … (429) | Turn on billing for the key's project (grounding is not in the free tier), or wait for the quota. |
| … without any web sources twice | Grounding did not run: check the model supports Google Search and the project has billing. |
| Gemini has no model called … | Set `CONTENT_SCOUT_MODEL` to a current model. |
| GitHub refused to open an issue (410) | Issues are turned off for the repository. |

## Changing it

- **Sections, content types, age bands and the weekly focus** live in
  `scripts/content-scout/catalogue.ts`. The tests check every file it names exists, the bands
  match `src/lib/age-groups.ts`, and the schema's lists match the app's skill areas and themes.
- **Safety rules** come from `src/lib/game-library/safety.ts`, so tightening the game rules
  tightens the scout too.
- **Prompts** are in `scripts/content-scout/scout-prompts.ts`. A rule only counts once code checks
  it (`suggestions.ts`). The prompt alone is a request, not a guarantee.
- **The workflow** keeps `permissions: {}` at the top and only `contents: read` and
  `issues: write` for its job, pins actions to commits and installs nothing.
  `src/__tests__/content-scout.test.ts` checks this.
- **Plain Node loads the app's modules.** Node strips types and does not compile, so a module the
  scout loads must import types with `import type`, and must not use enums or namespaces. The CI
  job "Content scout loads" runs `node scripts/content-scout/run.mjs --check` on every push to
  catch this.
