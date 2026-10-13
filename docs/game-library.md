# Game library

A library of practice games that players rotate through week by week, matched to their goals,
age and level, plus "match missions" to try in their own games. It all runs in the browser:
no AI call, no API key, nothing sent anywhere.

Status on 2026-10-13: **159 games, 32 twists, 53 match missions**, about 2,700 ways to play.

## How a week is chosen

Weeks run Monday to Sunday in the player's own time zone. Nothing is stored. The same date and
profile always give the same plan (`src/lib/game-library/rotation.ts`).

1. **Focus skill.** Read from the profile's goals and "areas to improve" (`skills.ts` matches the
   player's own words, so "better dribbler" and "score more goals" both work). With several goals
   the focus rotates through them week by week. If no goal matches, the player's position is used,
   and with no profile at all every skill takes a turn.
2. **Four games**, one for each way a player really plays:
   - **On your own** (works with one player)
   - **With a friend** (works with two or three)
   - **With a group** (works with four or more)
   - **Something new**, from a skill the player has not asked for, so they try new things
3. **A twist** on each game (weaker foot only, two touches, squeeze the space…), different each
   time that game comes round.
4. **A match mission** for the focus skill, and a **Game IQ round of the week** that links to
   the decision games.

To make sure a game never comes back before the others have had a turn, the plan *replays* every
week since Monday 1 January 2024. Each skill hands out its games in a fixed shuffled order, one
round at a time, and last week's games are never picked again straight away. This is a few
hundred cheap steps per page view and is covered by tests (zero repeats across 24 profiles over
a year).

## Data model

Defined in `src/types/index.ts`.

```ts
interface LibraryGame {
  id: string;            // starts with its skill, e.g. 'first-touch-wall-wizard'
  name: string;
  skill: SkillArea;      // main skill; `also` lists secondary ones
  players: [number, number];  // inclusive range. [1, 2] = alone or with a friend
  ages: [number, number];     // inclusive, 8 to 18
  level: 'beginner' | 'intermediate' | 'advanced';  // the lowest level it suits
  minutes: number;
  noTwists?: TwistKind[];    // kinds of twist this game can't take (see below)
  setup: string; howToPlay: string; focus: string; easier: string; harder: string;
}
```

A **twist** (`GameTwist`) is a rule change that fits many games: it names the skills it suits, the
number of players it needs and its `kind` (pace, streak, space, foot, touches, attention, call,
talk, players, target, scoring, handicap, roles, rules or mindset). A game can opt out of whole
kinds with `noTwists`: a calling game opts out of `talk` (so it is never told to "play in
silence"), a game with no roles opts out of `roles`, and games about landing, hopping or
warming up opt out of everything that rushes, scores or toughens them (`GENTLE_PRACTICE`).

A **match mission** (`MatchMission`) is one small thing to try in a real game, with a "why it
helps" line and an after-the-match question.

## Skill areas

Fourteen areas, chosen to line up with the skills that Football Australia, The FA and US Soccer
teach, plus the club principles of play (penetration, support, mobility, width, improvisation,
delay, cover, balance, concentration).

| Area | Covers |
| --- | --- |
| `first-touch` | Receiving, controlling, turning |
| `passing` | Short and long passing, combining |
| `dribbling` | Ball mastery, running with the ball |
| `taking-on` | 1v1 attacking, beating defenders |
| `defending-1v1` | Jockeying, patience, closing down |
| `finishing` | Shooting and finishing |
| `goalkeeping` | Handling, positioning, distribution |
| `movement` | Off-the-ball runs, support, width |
| `team-defending` | Pressing, cover, compactness |
| `transitions` | Counter-attacks, recovering shape |
| `vision` | Scanning, decisions |
| `creativity` | Improvisation, flair |
| `athleticism` | Warm-ups, agility, balance, speed |
| `teamwork` | Communication, composure, routines |

There is no heading skill on purpose (see Safety).

## Ages and levels

Games carry an inclusive age range. The three bands we design for follow how the national
frameworks group players:

| Band | Ages | Emphasis |
| --- | --- | --- |
| Explore | 8–10 | Ball mastery, both feet, 1v1 to 4v4 games, play for fun |
| Build | 11–13 | Passing and receiving under pressure, combinations, first principles |
| Apply | 14–18 | Principles in position, decision speed, roles, self-directed practice |

A player is never offered a game outside their age (age is never relaxed, even when a skill has
few games), and never one above their chosen level.

## Writing games

Rules for new content. The ones marked ✔ are enforced by `src/__tests__/game-library.test.ts`.

1. **Original wording.** Ideas are free to reuse; other people's text, diagrams and branded
   names are not. Rewrite, rename, and don't paste. (Tests can't check this, so reviewers must.)
2. ✔ **No heading, anywhere.** Not in games, twists or missions.
3. ✔ **No elimination, no sitting out, no exercise as a penalty, no shaming.** Use points,
   rounds, or swapping roles, and keep everyone playing.
4. ✔ **No roads, streets, driveways or car parks.** Nothing near traffic.
5. ✔ **Missions are process goals** the player fully controls. Never goals, wins or stats.
6. ✔ **Australian/British English** (the tests catch common US spellings), distances in
   "big steps".
7. ✔ **Every game has easier and harder versions**, and fits the length limits in the test.
8. ✔ **Coverage.** Every skill needs enough games at every age, for playing alone, with a friend
   and in a group, and every game needs enough twists.
9. ✔ **Twists must make sense.** Set `noTwists` when a twist would contradict or endanger the
   game. The tests check that no calling game gets the "quiet game" twist and no landing or
   jumping game gets a time limit or a streak.
10. **One problem per game**, and scoring should reward the behaviour being practised.
11. **Avoid queues.** If players must wait, give them something to do with their own ball.
12. **Both feet, flexible roles**, and never rank players by size or maturity.
13. **Get it reviewed.** Coach or safeguarding review before a batch ships. The tests catch
    wording, not whether a drill is sensible for a 9-year-old.

### Adding a game

1. Add an object to the skill's file in `src/lib/game-library/games/`.
2. Run `npm test`. The content tests will tell you if anything breaks a rule above.
3. Check it in the browser at `/games/` (open the first card, read it aloud as an 8-year-old).

## Safety decisions

- **Heading is not in the library.** The FA and Scottish FA ban heading in training up to age 11
  and cap it for 12–16s. We found no Football Australia age ban (one third-party site claims a
  2025 ban for under-12s, which we could not confirm) and an expert group there is reviewing the
  issue (ABC News, 2 July 2026). These games run without a coach to count repetitions, so heading is left to training.
  A player who lists heading as a goal sees a kind note instead. Adding heading later for 14+
  would need a clear supervised-practice flow, not just more games.
- **Play-safe note on the weekly page**: away from roads, driveways, car parks and windows; a
  grown-up in sight for under-10s; water; stop if hurt; stop and tell a grown-up after a knock to
  the head or if dizzy, sick or confused; rest days.
- **No streaks, no leaderboards, no daily pressure.** Scores are personal and optional.
- Warm-up and landing games are low-impact. The warm-up game points players to a structured
  injury-prevention warm-up from their coach.

## Research behind it

Three research passes on 2026-10-13: how national frameworks organise development by age, a
catalogue of generic game mechanics, and safety and match-day guidance. **Limitation:** the
research tool could not open web pages (DNS failures), so everything came from search summaries
and nothing here was checked against a primary page. Treat the sources below as leads to verify.

| Area | Confidence | Notes |
| --- | --- | --- |
| Age phases and formats | 68–75 | Football Australia curriculum, FA, US Soccer agree on broad bands; pitch sizes and session lengths are weaker |
| Skills taxonomy | 62–78 | Consistent across frameworks |
| Pedagogy (Game Sense, play–practice–play) | 70 | Evidence for specific constraint manipulations is thin; twists are good practice, not proven science |
| Heading and concussion guidance | 72 | England and Scotland agree; Football Australia's current position unconfirmed |
| Elimination games, punishment | 60 | From school PE and child-safeguarding sources, not a football body |
| Match missions as process goals | 55 | Process-goal evidence is moderate and mostly from older players |
| Licensing and trademarks | 55 | Not legal advice |

Leads worth reading in full:

- Football Australia National Football Curriculum (2017) and Skill Acquisition Manual (2018)
- The FA: England DNA, the Four Corner Model, youth heading guidance (2020, 2024 update)
- US Soccer: player development age-group guide and game formats
- Australian Sports Commission Game Sense approach (`sportaus.gov.au/p4l/game_sense_approach`)
- Football NSW and MiniRoos format guides; Football Australia's concussion policy (2022)
- AAP overuse injuries report (2024) and the FIFA 11+ Kids review (2024)

### Licensing

Game ideas, rules and methods are not copyrightable, but text, diagrams, video and curated
libraries are. The open licences found were all non-commercial (for example CC BY-NC-ND). The FA,
FIFA, US Soccer, Football Australia, DFB and KNVB terms reserve rights. So the library is written
from scratch, and nothing was copied. Avoid branded or registered names in content: Coerver,
Teqball, Panna Knock Out, FUNiño (say "four-goal game"), MiniRoos, club or player names, and
named moves (a move named after a person).

## Counting

- **Games**: distinct practices (159).
- **Ways to play**: each game once as written, plus once for every twist that fits it
  (about 2,700). A twist changes the rules enough to feel like a new game, but it is the same
  game underneath, so quote both numbers.
- **How long before a repeat?** At four games a week, a beginner aged 8 has about 93 eligible
  games (about 23 weeks), a 16-year-old beginner about 94 (about 23 weeks) and an intermediate
  12-year-old about 152 (about 38 weeks). Repeats come back with a different twist. A full year
  of fresh games for every player needs roughly 250–350 games.

## Roadmap

1. **Grow to about 300 games** in batches of 30–50 with a coach review each time. Priorities:
   more 14–18 games, more beginner games for older players, more solo and at-home games.
2. **Split the content once it passes about 500 games.** The games page script grows by about
   0.3 kB per game, so 1,000 games would roughly double the app. Load each skill's file on demand.
3. **Fold the Game IQ pitch games into the library** so players only see one list of games.
4. **Ask players what they tried**, and let them favourite games (needs a new local-storage key
   and a short note in `.claude/rules/api-conventions.md`).
5. **Let coaches share a weekly set** with a team (same week, same games).
