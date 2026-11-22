import fs from 'node:fs';
import path from 'node:path';
import { DECISION_THEMES } from '@/lib/decision-games';
import { describeDrillSetups, DRILL_SETUP_IDS } from '@/lib/drill-setups';
import { GAME_LIBRARY, GAME_TWISTS, MATCH_MISSIONS } from '@/lib/game-library';
import { fitsSlot } from '@/lib/game-library/rotation';
import { SKILL_AREAS } from '@/lib/game-library/skills';
import { BALANCE_AREAS } from '@/lib/wellbeing';
import type { SkillArea } from '@/types';
import {
  AGE_BANDS,
  PLAYER_SLOTS,
  type AgeBand,
  type ContentTypeId,
  type PlayersSlot,
} from './catalogue';

// What LuchoAI already has, so the model can aim at real gaps and the scout can refuse
// suggestions that copy something already in the app.

export interface CoverageCell {
  skill: SkillArea;
  band: AgeBand;
  slot: PlayersSlot;
  games: number;
}

export interface ExistingItem {
  type: ContentTypeId;
  name: string;
}

export interface KnowledgeDoc {
  file: string;
  title: string;
  lastReviewed: string;
}

export interface Inventory {
  counts: { games: number; twists: number; missions: number; situations: number };
  perBand: { band: AgeBand; games: number; beginner: number }[];
  thinnest: CoverageCell[];
  items: ExistingItem[];
  knowledgeDocs: KnowledgeDoc[];
}

const GAPS_SHOWN = 12;

// The wellbeing page's own tools live in its page component, which Node cannot load.
const WELLBEING_TOOLS = ['Mistake reset', 'Nerves tips', 'Balance facts', 'Calm breathing'];

function overlaps(ages: [number, number], band: AgeBand): boolean {
  return ages[0] <= band.max && ages[1] >= band.min;
}

function frontmatter(text: string, key: string): string {
  const head = text.startsWith('---') ? text.slice(3, text.indexOf('\n---', 3)) : '';
  const line = head.split('\n').find((l) => l.startsWith(`${key}:`));
  return line ? line.slice(key.length + 1).trim() : '';
}

export function readKnowledgeDocs(root: string): KnowledgeDoc[] {
  const dir = path.join(root, 'context');
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      return {
        file: `context/${file}`,
        title: frontmatter(text, 'title') || file,
        lastReviewed: frontmatter(text, 'last_reviewed') || 'unknown',
      };
    });
}

export function buildInventory(root: string): Inventory {
  const slots = Object.keys(PLAYER_SLOTS) as PlayersSlot[];
  const cells: CoverageCell[] = [];
  for (const skill of SKILL_AREAS) {
    for (const band of AGE_BANDS) {
      for (const slot of slots) {
        const games = GAME_LIBRARY.filter(
          (g) => g.skill === skill.id && overlaps(g.ages, band) && fitsSlot(g, slot),
        ).length;
        cells.push({ skill: skill.id, band, slot, games });
      }
    }
  }
  // A stable sort keeps the skill order for equal counts, so the list reads the same each week.
  const thinnest = [...cells].sort((a, b) => a.games - b.games).slice(0, GAPS_SHOWN);

  const items: ExistingItem[] = [
    ...GAME_LIBRARY.map((g) => ({ type: 'practice-game' as const, name: g.name })),
    ...GAME_TWISTS.map((t) => ({ type: 'game-twist' as const, name: t.name })),
    ...MATCH_MISSIONS.map((m) => ({ type: 'match-mission' as const, name: m.title })),
    ...DECISION_THEMES.flatMap((t) => [
      ...t.scenarios.map((s) => ({ type: 'game-iq-situation' as const, name: s.title })),
      ...t.pitchGames.map((g) => ({ type: 'practice-game' as const, name: g.name })),
    ]),
    ...DRILL_SETUP_IDS.map((id) => ({ type: 'drill-picture' as const, name: id })),
    ...WELLBEING_TOOLS.map((name) => ({ type: 'wellbeing-tool' as const, name })),
    ...BALANCE_AREAS.map((a) => ({ type: 'wellbeing-tool' as const, name: `${a.label} tip` })),
  ];
  const knowledgeDocs = readKnowledgeDocs(root);
  items.push(
    ...knowledgeDocs.map((d) => ({ type: 'coaching-knowledge' as const, name: d.title })),
  );

  return {
    counts: {
      games: GAME_LIBRARY.length,
      twists: GAME_TWISTS.length,
      missions: MATCH_MISSIONS.length,
      situations: DECISION_THEMES.reduce((n, t) => n + t.scenarios.length, 0),
    },
    perBand: AGE_BANDS.map((band) => {
      const games = GAME_LIBRARY.filter((g) => overlaps(g.ages, band));
      return {
        band,
        games: games.length,
        beginner: games.filter((g) => g.level === 'beginner').length,
      };
    }),
    thinnest,
    items,
    knowledgeDocs,
  };
}

function skillLabel(id: SkillArea): string {
  return SKILL_AREAS.find((s) => s.id === id)?.label ?? id;
}

/** The inventory as plain text for the suggestion prompt. */
export function describeInventory(inventory: Inventory): string {
  const { counts } = inventory;
  const gameNames = SKILL_AREAS.map((skill) => {
    const names = GAME_LIBRARY.filter((g) => g.skill === skill.id).map((g) => g.name);
    return `- ${skill.id} (${skill.label}): ${names.join('; ')}`;
  });
  const themes = DECISION_THEMES.map(
    (t) =>
      `- ${t.id} "${t.title}": ${t.scenarios.map((s) => s.title).join('; ')}` +
      ` | on-pitch games: ${t.pitchGames.map((g) => g.name).join('; ')}`,
  );
  const missions = SKILL_AREAS.map(
    (s) => `${s.id} ${MATCH_MISSIONS.filter((m) => m.skill === s.id).length}`,
  );
  return [
    `Weekly game library: ${counts.games} games, ${counts.twists} twists, ` +
      `${counts.missions} match missions. Game IQ: ${counts.situations} situations.`,
    'Games per age band: ' +
      inventory.perBand
        .map((b) => `${b.band.min}-${b.band.max}: ${b.games} (${b.beginner} for beginners)`)
        .join(', '),
    'Thinnest spots in the library (skill, ages, players: games there now):',
    ...inventory.thinnest.map(
      (c) =>
        `- ${skillLabel(c.skill)} (${c.skill}), ${c.band.min}-${c.band.max}, ` +
        `${PLAYER_SLOTS[c.slot].toLowerCase()}: ${c.games}`,
    ),
    'Roadmap priorities (docs/game-library.md): more 14-18 games, more beginner games for ' +
      'older players, more solo and at-home games.',
    'Existing games by skill area:',
    ...gameNames,
    `Existing twists: ${GAME_TWISTS.map((t) => t.name).join('; ')}`,
    `Match missions per skill area: ${missions.join(', ')}`,
    'Game IQ themes and their situations:',
    ...themes,
    'Drill pictures training plans can use now:',
    describeDrillSetups(),
    'AI knowledge base files:',
    ...inventory.knowledgeDocs.map(
      (d) => `- ${d.file}: ${d.title} (last reviewed ${d.lastReviewed})`,
    ),
    `Wellbeing page: ${WELLBEING_TOOLS.join(', ')}; check-in areas with a tip each: ` +
      `${BALANCE_AREAS.map((a) => a.label).join(', ')}.`,
  ].join('\n');
}
