'use client';

import { useId, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { PlayerPosition, ProfileAuthor, SkillLevel } from '@/types';
import type { IconName } from '@/lib/icons';
import {
  aboutCopy,
  ageHint,
  AUTHOR_CHOICES,
  GOAL_PICK_LIMIT,
  goalsCopy,
  levelCopy,
  positionCopy,
  sureHint,
} from '@/lib/profile-copy';
import type { Audience, Choice } from '@/lib/profile-copy';
import {
  PROFILE_MAX_AGE,
  PROFILE_MAX_ENTRIES,
  PROFILE_MAX_ENTRY_LENGTH,
  PROFILE_MAX_NAME_LENGTH,
  PROFILE_MIN_AGE,
} from '@/lib/storage';
import Icon from './Icon';

const AGES: number[] = Array.from(
  { length: PROFILE_MAX_AGE - PROFILE_MIN_AGE + 1 },
  (_, i) => PROFILE_MIN_AGE + i,
);

/** The heading tag for a question: the page title in set-up, a section title when editing. */
export type HeadingTag = 'h1' | 'h2';

const HEADING_CLASS: Record<HeadingTag, string> = {
  h1: 'text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight outline-none',
  h2: 'text-xl font-bold text-gray-900 leading-tight',
};

const FIELD =
  'block w-full min-w-0 rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base ' +
  'text-gray-900 focus:outline-none focus:ring-2 focus:ring-pitch-green';

// A focus ring on the card, because the radio or checkbox inside it is visually hidden.
const FOCUS_RING =
  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pitch-green ' +
  'has-[:focus-visible]:ring-offset-2';

const CARD = `flex w-full cursor-pointer gap-3 rounded-2xl border-2 text-left ${FOCUS_RING}`;
const SELECTED_CARD = 'border-pitch-green bg-green-50';
const UNSELECTED_CARD = 'border-gray-200 bg-white hover:border-gray-300';
const BADGE =
  'self-start rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800';

// Small one-tap choices: ages and the "how sure" answer.
const TOGGLE = `flex cursor-pointer items-center justify-center rounded-xl border-2 ${FOCUS_RING}`;
const TOGGLE_ON = 'border-pitch-green bg-pitch-green text-white';
const TOGGLE_OFF = 'border-gray-200 bg-white text-gray-800 hover:border-gray-300';

const REMOVE_BUTTON =
  'absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-lg ' +
  'text-gray-500 hover:bg-gray-100 hover:text-red-700';
const ADD_BUTTON =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed ' +
  'border-gray-400 bg-white px-4 text-base font-semibold text-gray-700 hover:border-gray-500';

interface QuestionHeaderProps {
  as: HeadingTag;
  id: string;
  title: string;
  intro?: string;
  kicker?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
}

function QuestionHeader({ as: Tag, id, title, intro, kicker, headingRef }: QuestionHeaderProps) {
  return (
    <div className="space-y-2">
      {kicker && <p className="text-base font-semibold text-pitch-green">{kicker}</p>}
      <Tag
        id={id}
        ref={headingRef}
        tabIndex={Tag === 'h1' ? -1 : undefined}
        className={HEADING_CLASS[Tag]}
      >
        {title}
      </Tag>
      {intro && <p className="text-base text-gray-600">{intro}</p>}
    </div>
  );
}

function CheckMark({ on }: { on: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="flex-shrink-0">
      {on ? (
        <>
          <circle cx="12" cy="12" r="11" fill="#1a7f3c" />
          <path
            d="M7 12.5l3.2 3.2L17 9"
            stroke="#fff"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="#d1d5db" strokeWidth="2" />
      )}
    </svg>
  );
}

type Zone = 'front' | 'middle' | 'back' | 'goal';

const POSITION_ZONES: Record<PlayerPosition, Zone[]> = {
  forward: ['front'],
  midfielder: ['middle'],
  defender: ['back'],
  goalkeeper: ['goal'],
  'all-round': ['front', 'middle', 'back', 'goal'],
};

const ZONE_RECTS: Record<Zone, { x: number; y: number; width: number; height: number }> = {
  front: { x: 5, y: 8, width: 34, height: 12 },
  middle: { x: 5, y: 23, width: 34, height: 14 },
  back: { x: 5, y: 40, width: 34, height: 9 },
  goal: { x: 15, y: 51, width: 14, height: 7 },
};

interface MiniPitchProps {
  position: PlayerPosition;
  small?: boolean;
}

/** A small pitch, attacking upwards, with the player's part of it filled in. */
export function MiniPitch({ position, small = false }: MiniPitchProps) {
  return (
    <svg
      width={small ? 34 : 44}
      height={small ? 46 : 60}
      viewBox="0 0 44 60"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <rect
        x="1"
        y="1"
        width="42"
        height="58"
        rx="5"
        fill="#e7f3eb"
        stroke="#1a7f3c"
        strokeWidth="1.5"
      />
      <line x1="1" y1="30" x2="43" y2="30" stroke="#1a7f3c" strokeOpacity="0.5" />
      <rect x="15" y="1" width="14" height="5" fill="none" stroke="#1a7f3c" />
      <rect x="15" y="54" width="14" height="5" fill="none" stroke="#1a7f3c" />
      {POSITION_ZONES[position].map((zone) => (
        <rect key={zone} {...ZONE_RECTS[zone]} rx="3" fill="#1a7f3c" />
      ))}
    </svg>
  );
}

interface ChoiceCardProps<T extends string> {
  name: string;
  choice: Choice<T>;
  selected: boolean;
  onSelect: (value: T) => void;
  visual?: ReactNode;
  compact?: boolean;
  stacked?: boolean;
}

function ChoiceCard<T extends string>({
  name,
  choice,
  selected,
  onSelect,
  visual,
  compact = false,
  stacked = false,
}: ChoiceCardProps<T>) {
  const look = selected ? SELECTED_CARD : UNSELECTED_CARD;
  const layout = stacked ? 'flex-col items-start' : 'items-center';
  return (
    <label className={`${CARD} ${compact ? 'p-3' : 'p-4'} ${layout} ${look}`}>
      <input
        type="radio"
        name={name}
        value={choice.value}
        checked={selected}
        onChange={() => onSelect(choice.value)}
        className="sr-only"
      />
      {visual ?? (choice.icon && <Icon name={choice.icon} size={compact ? 32 : 40} />)}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {choice.badge && (
          <span className={BADGE}>
            {choice.badge}
          </span>
        )}
        <span className="text-base font-bold text-gray-900 sm:text-lg">
          {choice.title}
          {choice.term && <span className="font-medium text-gray-600"> ({choice.term})</span>}
        </span>
        <span className="text-sm text-gray-600">{choice.text}</span>
      </span>
      {!stacked && <CheckMark on={selected} />}
    </label>
  );
}

function Tip({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <Icon name={icon} size={32} />
      <p className="text-sm text-gray-700 sm:text-base">{children}</p>
    </div>
  );
}

interface QuestionProps {
  as: HeadingTag;
  headingRef?: React.Ref<HTMLHeadingElement>;
}

/* Who is filling this in */

interface WhoQuestionProps extends QuestionProps {
  author: ProfileAuthor | null;
  onChange: (author: ProfileAuthor) => void;
}

export function WhoQuestion({ as, headingRef, author, onChange }: WhoQuestionProps) {
  const id = useId();
  return (
    <section className="space-y-5">
      <QuestionHeader
        as={as}
        id={id}
        headingRef={headingRef}
        kicker={as === 'h1' ? 'Welcome to LuchoAI' : undefined}
        title={as === 'h1' ? 'Who is setting up this profile?' : 'Who is filling this in?'}
      />
      <div role="radiogroup" aria-labelledby={id} className="space-y-3">
        {AUTHOR_CHOICES.map((choice) => (
          <ChoiceCard
            key={choice.value}
            name={`${id}-who`}
            choice={choice}
            selected={author === choice.value}
            onSelect={onChange}
            compact={as === 'h2'}
          />
        ))}
      </div>
      {as === 'h1' && (
        <Tip icon="thinking">
          Either way, the coach talks to the player. Every question has a &quot;not sure&quot;
          answer, and you can change anything later.
        </Tip>
      )}
    </section>
  );
}

/* Name and age */

interface AboutQuestionProps extends QuestionProps {
  author: ProfileAuthor;
  name: string;
  age: number | null;
  onName: (name: string) => void;
  onAge: (age: number) => void;
}

export function AboutQuestion(props: AboutQuestionProps) {
  const { as, headingRef, author, name, age, onName, onAge } = props;
  const id = useId();
  const copy = aboutCopy(author);
  return (
    <section className="space-y-5">
      <QuestionHeader as={as} id={id} headingRef={headingRef} title={copy.heading} />
      <div className="space-y-2">
        <label htmlFor={`${id}-name`} className="block text-base font-semibold text-gray-900">
          {copy.nameLabel}
        </label>
        <input
          id={`${id}-name`}
          type="text"
          value={name}
          onChange={(e) => onName(e.target.value)}
          maxLength={PROFILE_MAX_NAME_LENGTH}
          autoComplete="off"
          aria-describedby={`${id}-name-hint`}
          className={FIELD}
        />
        <p id={`${id}-name-hint`} className="text-sm text-gray-600">
          {copy.nameHint}
        </p>
      </div>
      <div className="space-y-3">
        <p id={`${id}-age`} className="text-base font-semibold text-gray-900">
          {copy.ageLabel}
        </p>
        <div role="radiogroup" aria-labelledby={`${id}-age`} className="grid grid-cols-6 gap-2">
          {AGES.map((option) => (
            <label
              key={option}
              className={`${TOGGLE} h-12 text-lg font-bold ${
                option === age ? TOGGLE_ON : TOGGLE_OFF
              }`}
            >
              <input
                type="radio"
                name={`${id}-age`}
                value={option}
                checked={option === age}
                onChange={() => onAge(option)}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
      </div>
      {age !== null && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
          <Icon name="sprout" size={32} />
          <p className="text-sm text-green-900 sm:text-base">{ageHint(age)}</p>
        </div>
      )}
    </section>
  );
}

/* Position */

interface PositionQuestionProps extends QuestionProps {
  audience: Audience;
  position: PlayerPosition | null;
  exploring: boolean;
  onPosition: (position: PlayerPosition) => void;
  onExploring: (exploring: boolean) => void;
}

export function PositionQuestion(props: PositionQuestionProps) {
  const { as, headingRef, audience, position, exploring, onPosition, onExploring } = props;
  const id = useId();
  const copy = positionCopy(audience);
  const allRound = copy.choices.find((c) => c.value === 'all-round');
  const pitch = copy.choices.filter((c) => c.value !== 'all-round');
  const grid = copy.layout === 'grid';
  const card = (choice: Choice<PlayerPosition>, big: boolean) => (
    <ChoiceCard
      key={choice.value}
      name={`${id}-position`}
      choice={choice}
      selected={position === choice.value}
      onSelect={onPosition}
      compact={!big}
      stacked={grid && choice.value !== 'all-round'}
      visual={
        grid && choice.value !== 'all-round' ? undefined : (
          <MiniPitch position={choice.value} small={!big} />
        )
      }
    />
  );
  const teenIcons: Record<string, IconName> = {
    goalkeeper: 'glove',
    defender: 'shield',
    midfielder: 'shuffle',
    forward: 'goal',
  };
  const pitchCards = grid
    ? pitch.map((choice) => card({ ...choice, icon: teenIcons[choice.value] }, false))
    : pitch.map((choice) => card(choice, false));

  return (
    <section className="space-y-5">
      <QuestionHeader
        as={as}
        id={id}
        headingRef={headingRef}
        title={copy.heading}
        intro={copy.intro}
      />
      <div role="radiogroup" aria-labelledby={id} className="space-y-3">
        {copy.allRoundFirst && allRound && (
          <>
            {card(allRound, true)}
            <div className="flex items-center gap-3 py-1" aria-hidden="true">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-sm font-semibold text-gray-600">{copy.divider}</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </>
        )}
        {grid ? (
          <div className="grid grid-cols-2 gap-3">{pitchCards}</div>
        ) : (
          <div className="space-y-2">{pitchCards}</div>
        )}
        {!copy.allRoundFirst && allRound && card(allRound, false)}
      </div>
      {position && position !== 'all-round' && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <p id={`${id}-sure`} className="text-base font-bold text-gray-900">
            {copy.sureLegend}
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-sure`} className="grid grid-cols-2 gap-2">
            {[
              { value: false, label: copy.settledLabel },
              { value: true, label: copy.exploringLabel },
            ].map((option) => (
              <label
                key={option.label}
                className={`${TOGGLE} min-h-12 p-2 text-center text-sm font-semibold sm:text-base ${
                  exploring === option.value ? TOGGLE_ON : TOGGLE_OFF
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-sure`}
                  checked={exploring === option.value}
                  onChange={() => onExploring(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-700">{sureHint(position, exploring)}</p>
        </div>
      )}
    </section>
  );
}

/* Level */

interface LevelQuestionProps extends QuestionProps {
  audience: Audience;
  level: SkillLevel;
  onLevel: (level: SkillLevel) => void;
}

export function LevelQuestion({ as, headingRef, audience, level, onLevel }: LevelQuestionProps) {
  const id = useId();
  const copy = levelCopy(audience);
  return (
    <section className="space-y-5">
      <QuestionHeader
        as={as}
        id={id}
        headingRef={headingRef}
        title={copy.heading}
        intro={copy.intro}
      />
      <div role="radiogroup" aria-labelledby={id} className="space-y-3">
        {copy.choices.map((choice) => (
          <ChoiceCard
            key={choice.value}
            name={`${id}-level`}
            choice={choice}
            selected={level === choice.value}
            onSelect={onLevel}
          />
        ))}
      </div>
      <Tip icon="thinking">{copy.hint}</Tip>
    </section>
  );
}

/* Goals and the tricky bits */

interface ListEntryProps {
  value: string;
  label: string;
  removeLabel: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}

// A textarea that grows with its text, so a long goal is never hidden behind a scrolling
// one-line box. The remove cross sits inside the box; the right padding keeps text clear of it.
function ListEntry({ value, label, removeLabel, onChange, onRemove }: ListEntryProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [value]);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value.replace(/\s*\n+\s*/g, ' '))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        placeholder="Type it here"
        maxLength={PROFILE_MAX_ENTRY_LENGTH}
        className={`${FIELD} resize-none overflow-hidden pr-11 leading-6`}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className={REMOVE_BUTTON}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

interface ChipPickerProps {
  labelledBy: string;
  chips: { label: string; icon?: IconName }[];
  picked: string[];
  canPickMore: boolean;
  tiles: boolean;
  onToggle: (label: string) => void;
}

function ChipPicker({ labelledBy, chips, picked, canPickMore, tiles, onToggle }: ChipPickerProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className={tiles ? 'grid grid-cols-2 gap-3' : 'flex flex-wrap gap-2'}
    >
      {chips.map((chip) => {
        const on = picked.includes(chip.label);
        const disabled = !on && !canPickMore;
        const look = on
          ? tiles
            ? 'border-pitch-green bg-green-50'
            : 'border-pitch-green bg-pitch-green text-white'
          : 'border-gray-200 bg-white text-gray-800';
        return (
          <label
            key={chip.label}
            className={`${FOCUS_RING} border-2 font-semibold ${look} ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-300'
            } ${
              tiles
                ? 'flex flex-col gap-2 rounded-2xl p-3 text-base text-gray-900'
                : 'inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm sm:text-base'
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              disabled={disabled}
              onChange={() => onToggle(chip.label)}
              className="sr-only"
            />
            {tiles ? (
              <>
                <span className="flex items-start justify-between">
                  {chip.icon && <Icon name={chip.icon} size={32} />}
                  {on && <CheckMark on />}
                </span>
                <span>{chip.label}</span>
              </>
            ) : (
              chip.label
            )}
          </label>
        );
      })}
    </div>
  );
}

export interface ChipList {
  picked: string[];
  custom: string[];
}

interface ChipListEditorProps {
  headingId: string;
  groups: { title: string; chips: { label: string; icon?: IconName }[] }[];
  list: ChipList;
  tiles: boolean;
  customLabel: string;
  noun: string;
  onChange: (list: ChipList) => void;
}

function ChipListEditor(props: ChipListEditorProps) {
  const { headingId, groups, list, tiles, customLabel, noun, onChange } = props;
  const filledCustom = list.custom.filter((c) => c.trim()).length;
  const canPickMore =
    list.picked.length < GOAL_PICK_LIMIT && list.picked.length + filledCustom < PROFILE_MAX_ENTRIES;
  const canAddCustom = list.picked.length + list.custom.length < PROFILE_MAX_ENTRIES;

  const toggle = (label: string): void => {
    const picked = list.picked.includes(label)
      ? list.picked.filter((p) => p !== label)
      : [...list.picked, label];
    onChange({ ...list, picked });
  };
  const setCustom = (custom: string[]): void => onChange({ ...list, custom });

  // A pick from another age or position's list (after changing either) stays visible, so it
  // can still be taken off.
  const shown = new Set(groups.flatMap((g) => g.chips.map((c) => c.label)));
  const stray = list.picked.filter((label) => !shown.has(label)).map((label) => ({ label }));
  const allGroups = stray.length
    ? groups.map((g, i) => (i === 0 ? { ...g, chips: [...g.chips, ...stray] } : g))
    : groups;

  return (
    <div className="space-y-4">
      {allGroups.map((group, i) => (
        <div key={group.title || i} className="space-y-2">
          {group.title && (
            <h3
              id={`${headingId}-g${i}`}
              className="text-sm font-bold uppercase tracking-wide text-gray-700"
            >
              {group.title}
            </h3>
          )}
          <ChipPicker
            labelledBy={group.title ? `${headingId}-g${i}` : headingId}
            chips={group.chips}
            picked={list.picked}
            canPickMore={canPickMore}
            tiles={tiles}
            onToggle={toggle}
          />
        </div>
      ))}
      {list.custom.map((value, i) => (
        <ListEntry
          key={i}
          value={value}
          label={`Your own ${noun} ${i + 1}`}
          removeLabel={`Remove your own ${noun} ${i + 1}`}
          onChange={(v) => setCustom(list.custom.map((c, j) => (j === i ? v : c)))}
          onRemove={() => setCustom(list.custom.filter((_, j) => j !== i))}
        />
      ))}
      {canAddCustom && (
        <button
          type="button"
          onClick={() => setCustom([...list.custom, ''])}
          className={ADD_BUTTON}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          {list.custom.length > 0 ? `Add another ${noun}` : customLabel}
        </button>
      )}
    </div>
  );
}

interface GoalsQuestionProps extends QuestionProps {
  audience: Audience;
  position: PlayerPosition;
  goals: ChipList;
  tricky: ChipList;
  onGoals: (goals: ChipList) => void;
  onTricky: (tricky: ChipList) => void;
}

export function GoalsQuestion(props: GoalsQuestionProps) {
  const { as, headingRef, audience, position, goals, tricky, onGoals, onTricky } = props;
  const id = useId();
  const copy = goalsCopy(audience, position);
  const SubHeading = as === 'h1' ? 'h2' : 'h3';
  return (
    <section className="space-y-5">
      <QuestionHeader
        as={as}
        id={id}
        headingRef={headingRef}
        title={copy.heading}
        intro={copy.intro}
      />
      <p className="text-sm font-semibold text-pitch-green" aria-live="polite">
        {`${goals.picked.length} of ${GOAL_PICK_LIMIT} picked`}
        {goals.picked.length >= GOAL_PICK_LIMIT ? '. Tap one again to swap it.' : ''}
      </p>
      <ChipListEditor
        headingId={id}
        groups={copy.groups}
        list={goals}
        tiles={copy.layout === 'tiles'}
        customLabel={copy.customLabel}
        noun="goal"
        onChange={onGoals}
      />
      <div className="space-y-3 pt-2">
        <div>
          <SubHeading id={`${id}-tricky`} className="text-lg font-bold text-gray-900">
            {copy.trickyHeading}
          </SubHeading>
          <p className="text-base text-gray-600">{copy.trickyNote}</p>
        </div>
        <ChipListEditor
          headingId={`${id}-tricky`}
          groups={[{ title: '', chips: copy.tricky.map((label) => ({ label })) }]}
          list={tricky}
          tiles={false}
          customLabel={copy.trickyCustomLabel}
          noun="tricky thing"
          onChange={onTricky}
        />
      </div>
    </section>
  );
}
