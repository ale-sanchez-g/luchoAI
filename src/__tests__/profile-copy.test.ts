import { skillsFromText } from '@/lib/game-library/skills';
import { getAgeGroup } from '@/lib/age-groups';
import { describePosition, exploringByDefault, isExploring } from '@/lib/positions';
import {
  ageHint,
  allGoalChips,
  allTrickyChips,
  getAudience,
  goalsCopy,
  levelCopy,
  parentDoneCopy,
  positionCopy,
} from '@/lib/profile-copy';
import type { ProfileAuthor } from '@/types';

const AUTHORS: ProfileAuthor[] = ['player', 'parent'];
const AGES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

// Goals the weekly games can't match to a skill on purpose: the coach and plan still read them.
const UNMATCHED_GOALS = ['Weaker foot'];

describe('age groups', () => {
  it('splits players into 8-10, 11-13 and 14-18', () => {
    expect(AGES.map(getAgeGroup)).toEqual([
      'young', 'young', 'young', 'middle', 'middle', 'middle',
      'teen', 'teen', 'teen', 'teen', 'teen',
    ]);
    expect(getAgeGroup('ten')).toBe('middle');
  });

  it('says what the age changes', () => {
    expect(ageHint(9)).toBe(
      'At 9: 30 to 45 minutes, with short, playful sessions, simple words and lots of games.',
    );
  });
});

describe('positions', () => {
  it('starts under-14s as still finding out and 14-18s as settled', () => {
    expect(exploringByDefault(13)).toBe(true);
    expect(exploringByDefault(14)).toBe(false);
  });

  it('always treats "try them all" as exploring', () => {
    expect(isExploring({ position: 'all-round', exploring: false })).toBe(true);
    expect(isExploring({ position: 'defender' })).toBe(false);
    expect(describePosition({ position: 'defender', exploring: true })).toBe(
      'Defender, still trying other positions',
    );
  });
});

describe('profile set-up wording', () => {
  it('always offers a "not sure" answer for position, at every age and for parents', () => {
    for (const author of AUTHORS) {
      for (const age of AGES) {
        const copy = positionCopy(getAudience(author, age, 'Mia'));
        expect(copy.choices.map((c) => c.value).sort()).toEqual(
          ['all-round', 'defender', 'forward', 'goalkeeper', 'midfielder'],
        );
      }
    }
  });

  it('shows "try them all" first only for under-11s', () => {
    expect(positionCopy(getAudience('player', 10, 'Mia')).allRoundFirst).toBe(true);
    expect(positionCopy(getAudience('parent', 9, 'Mia')).allRoundFirst).toBe(true);
    expect(positionCopy(getAudience('player', 11, 'Sam')).allRoundFirst).toBe(false);
  });

  it('keeps position names away from the youngest players', () => {
    const titles = positionCopy(getAudience('player', 9, 'Mia')).choices.map((c) => c.title);
    titles.forEach((title) =>
      expect(title).not.toMatch(/forward|midfielder|defender|goalkeeper/i),
    );
  });

  it('gives a parent the football word next to each plain one', () => {
    const copy = positionCopy(getAudience('parent', 12, 'Sam'));
    copy.choices
      .filter((c) => c.value !== 'all-round')
      .forEach((c) => expect(c.term).toBeTruthy());
  });

  it('never uses a name that is still empty', () => {
    const parent = getAudience('parent', 9, '  ');
    expect(positionCopy(parent).heading).toBe('Where does your child like to play?');
    expect(parentDoneCopy(parent, 'all-round', true).heading).toBe("Your child's profile is ready");
    expect(positionCopy(getAudience('player', 9, '')).heading).toBe('Where do you like to play?');
    expect(levelCopy(parent).heading).toBe('How much football does your child play?');
  });

  it('only suggests goals the weekly games understand', () => {
    allGoalChips()
      .filter((label) => !UNMATCHED_GOALS.includes(label))
      .forEach((label) => expect([label, skillsFromText(label)]).not.toEqual([label, []]));
  });

  it('never suggests heading', () => {
    [...allGoalChips(), ...allTrickyChips()].forEach((label) =>
      expect(label).not.toMatch(/head/i),
    );
  });

  it('never points a goalkeeper at shooting games', () => {
    for (const age of [12, 16]) {
      const copy = goalsCopy(getAudience('player', age, 'Jo'), 'goalkeeper');
      copy.groups[0].chips.forEach((chip) =>
        expect(skillsFromText(chip.label)).not.toContain('finishing'),
      );
    }
  });

  it('matches the suggestions to the position from age 11', () => {
    const copy = goalsCopy(getAudience('player', 15, 'Jo'), 'defender');
    expect(copy.groups[0].title).toBe('For defenders');
    expect(copy.layout).toBe('pills');
    expect(goalsCopy(getAudience('player', 9, 'Mia'), 'defender').layout).toBe('tiles');
  });
});
