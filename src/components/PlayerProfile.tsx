'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PlayerPosition, PlayerProfile, ProfileAuthor, SkillLevel } from '@/types';
import type { IconName } from '@/lib/icons';
import { PROFILE_MAX_ENTRIES, setPlayerProfile } from '@/lib/storage';
import { describePosition, exploringByDefault } from '@/lib/positions';
import {
  allGoalChips,
  allTrickyChips,
  editHeading,
  getAudience,
  GOAL_PICK_LIMIT,
  parentDoneCopy,
  playerDoneHeading,
  positionCopy,
} from '@/lib/profile-copy';
import { SKILL_LEVEL_LABELS } from '@/lib/skill-levels';
import {
  AboutQuestion,
  GoalsQuestion,
  LevelQuestion,
  PositionQuestion,
  WhoQuestion,
} from './ProfileQuestions';
import type { ChipList } from './ProfileQuestions';
import Icon from './Icon';

interface PlayerProfileFormProps {
  initialProfile: PlayerProfile | null;
  onSave: (profile: PlayerProfile) => void;
}

// Nothing is picked for the player until they choose, apart from "try every position" for
// under-11s: a silent default (it used to be Midfielder) reads as their own answer later.
interface Draft {
  author: ProfileAuthor | null;
  name: string;
  age: number | null;
  position: PlayerPosition | null;
  exploring: boolean | null;
  skillLevel: SkillLevel;
  goals: ChipList;
  tricky: ChipList;
}

const STEPS = ['who', 'about', 'position', 'level', 'goals'] as const;
const FALLBACK_AGE = 12;
const EMPTY_LIST: ChipList = { picked: [], custom: [] };

const BUTTON_PRIMARY =
  'flex-1 rounded-xl bg-pitch-green px-4 py-3.5 text-base font-bold text-white ' +
  'hover:bg-pitch-dark transition-colors';
const TITLE = 'text-2xl font-extrabold text-gray-900 outline-none sm:text-3xl';
const PANEL = 'space-y-3 rounded-2xl border border-gray-200 bg-white p-4';
const NEXT_STEP_LINK =
  'flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 text-base ' +
  'font-bold text-gray-900 hover:border-pitch-green';
const BUTTON_SECONDARY =
  'rounded-xl border-2 border-gray-300 bg-white px-5 py-3 text-base font-semibold ' +
  'text-gray-700 hover:border-gray-400';

// Saved goals that match a chip show up as that chip, picked; anything else stays as typed.
function splitEntries(entries: string[], chips: string[]): ChipList {
  const byLowerCase = new Map(chips.map((chip) => [chip.toLowerCase(), chip]));
  const picked: string[] = [];
  const custom: string[] = [];
  for (const entry of entries) {
    const chip = byLowerCase.get(entry.trim().toLowerCase());
    if (chip && !picked.includes(chip) && picked.length < GOAL_PICK_LIMIT) picked.push(chip);
    else custom.push(entry);
  }
  return { picked, custom };
}

function draftFrom(profile: PlayerProfile | null): Draft {
  if (!profile) {
    return {
      author: null,
      name: '',
      age: null,
      position: null,
      exploring: null,
      skillLevel: 'beginner',
      goals: EMPTY_LIST,
      tricky: EMPTY_LIST,
    };
  }
  return {
    author: profile.setupBy ?? 'player',
    name: profile.name,
    age: profile.age,
    position: profile.position,
    exploring: profile.exploring ?? false,
    skillLevel: profile.skillLevel,
    goals: splitEntries(profile.goals, allGoalChips()),
    tricky: splitEntries(profile.weaknesses, allTrickyChips()),
  };
}

function entries(list: ChipList): string[] {
  const custom = list.custom.map((c) => c.trim()).filter(Boolean);
  return [...list.picked, ...custom].slice(0, PROFILE_MAX_ENTRIES);
}

function toProfile(draft: Draft): PlayerProfile {
  const age = draft.age ?? FALLBACK_AGE;
  const position = draft.position ?? 'all-round';
  return {
    name: draft.name.trim(),
    age,
    position,
    exploring: position === 'all-round' || (draft.exploring ?? exploringByDefault(age)),
    setupBy: draft.author ?? 'player',
    skillLevel: draft.skillLevel,
    goals: entries(draft.goals),
    weaknesses: entries(draft.tricky),
  };
}

function NextStepLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      className={NEXT_STEP_LINK}
    >
      <Icon name={icon} size={36} />
      <span className="flex-1">{label}</span>
      <span aria-hidden="true" className="text-pitch-green">
        &rarr;
      </span>
    </Link>
  );
}

export default function PlayerProfileForm({ initialProfile, onSave }: PlayerProfileFormProps) {
  const [mode, setMode] = useState<'setup' | 'edit' | 'done'>(initialProfile ? 'edit' : 'setup');
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initialProfile));
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [handedOver, setHandedOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Each new screen starts at the top with its question announced, as a new page would.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    headingRef.current?.focus();
  }, [step, mode, handedOver]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const author = draft.author ?? 'player';
  const audience = getAudience(author, draft.age ?? FALLBACK_AGE, draft.name);

  function update(patch: Partial<Draft>): void {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
    setSaved(false);
  }

  function choosePosition(position: PlayerPosition): void {
    const age = draft.age ?? FALLBACK_AGE;
    update({ position, exploring: draft.exploring ?? exploringByDefault(age) });
  }

  function problemWith(stepName: (typeof STEPS)[number]): string {
    if (stepName === 'who' && !draft.author) return 'Pick one to carry on.';
    if (stepName === 'about') {
      if (!draft.name.trim()) return 'Please add a name or a nickname.';
      if (draft.age === null) return 'Pick an age to carry on.';
    }
    if (stepName === 'position' && !draft.position) {
      const notSure = positionCopy(audience).choices.find((c) => c.value === 'all-round');
      return `Pick one to carry on. Not sure? Choose "${notSure?.title}".`;
    }
    return '';
  }

  function goNext(): void {
    const problem = problemWith(STEPS[step]);
    if (problem) {
      setError(problem);
      return;
    }
    if (STEPS[step] === 'about' && draft.position === null && audience.group === 'young') {
      update({ position: 'all-round' });
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      setError('');
      return;
    }
    const profile = toProfile(draft);
    setPlayerProfile(profile);
    onSave(profile);
    setMode('done');
  }

  function goBack(): void {
    setError('');
    setStep(Math.max(0, step - 1));
  }

  function saveEdits(e: React.FormEvent): void {
    e.preventDefault();
    const problem = problemWith('about');
    if (problem) {
      setError(problem);
      return;
    }
    const profile = toProfile(draft);
    setPlayerProfile(profile);
    onSave(profile);
    setDraft(draftFrom(profile));
    setSaved(true);
  }

  function question(stepName: (typeof STEPS)[number], as: 'h1' | 'h2') {
    const ref = as === 'h1' ? headingRef : undefined;
    switch (stepName) {
      case 'who':
        return (
          <WhoQuestion
            as={as}
            headingRef={ref}
            author={draft.author}
            onChange={(a) => update({ author: a })}
          />
        );
      case 'about':
        return (
          <AboutQuestion
            as={as}
            headingRef={ref}
            author={author}
            name={draft.name}
            age={draft.age}
            onName={(name) => update({ name })}
            onAge={(age) => update({ age })}
          />
        );
      case 'position':
        return (
          <PositionQuestion
            as={as}
            headingRef={ref}
            audience={audience}
            position={draft.position}
            exploring={draft.exploring ?? exploringByDefault(audience.age)}
            onPosition={choosePosition}
            onExploring={(exploring) => update({ exploring })}
          />
        );
      case 'level':
        return (
          <LevelQuestion
            as={as}
            headingRef={ref}
            audience={audience}
            level={draft.skillLevel}
            onLevel={(skillLevel) => update({ skillLevel })}
          />
        );
      default:
        return (
          <GoalsQuestion
            as={as}
            headingRef={ref}
            audience={audience}
            position={draft.position ?? 'all-round'}
            goals={draft.goals}
            tricky={draft.tricky}
            onGoals={(goals) => update({ goals })}
            onTricky={(tricky) => update({ tricky })}
          />
        );
    }
  }

  const errorMessage = error && (
    <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
      {error}
    </p>
  );

  if (mode === 'done') {
    const profile = toProfile(draft);
    if (author === 'parent' && !handedOver) {
      const copy = parentDoneCopy(audience, profile.position, profile.exploring === true);
      return (
        <div key="handoff" className="mx-auto max-w-lg space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Icon name="check-circle" size={56} />
            <h1 ref={headingRef} tabIndex={-1} className={TITLE}>
              {copy.heading}
            </h1>
          </div>
          <section aria-label="Profile summary" className={PANEL}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-gray-900">
                {profile.name}, {profile.age}
              </h2>
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="px-1 py-2 text-base font-semibold text-pitch-green underline"
              >
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-semibold text-gray-600">Position</dt>
                <dd className="font-semibold text-gray-900">{describePosition(profile)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-600">Level</dt>
                <dd className="font-semibold text-gray-900">
                  {SKILL_LEVEL_LABELS[profile.skillLevel]}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="font-semibold text-gray-600">Goals</dt>
                <dd className="font-semibold text-gray-900">
                  {profile.goals.length > 0 ? profile.goals.join(', ') : 'None yet'}
                </dd>
              </div>
            </dl>
          </section>
          <section className={PANEL}>
            <h2 className="text-base font-bold text-gray-900">What happens next</h2>
            {(
              [
                ['clipboard', copy.planLine],
                ['speaking', copy.coachLine],
                ['heart', copy.wellbeingLine],
              ] as [IconName, string][]
            ).map(([icon, line]) => (
              <div key={icon} className="flex items-start gap-3">
                <Icon name={icon} size={32} />
                <p className="text-sm text-gray-700 sm:text-base">{line}</p>
              </div>
            ))}
          </section>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setHandedOver(true)} className={BUTTON_PRIMARY}>
              Hand over to {profile.name}
            </button>
            <Link href="/" className={`${BUTTON_SECONDARY} text-center`}>
              Look around first
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div key="player-done" className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Icon name="check-circle" size={56} />
          <h1 ref={headingRef} tabIndex={-1} className={TITLE}>
            {playerDoneHeading(profile.name)}
          </h1>
          <p className="text-base text-gray-600">
            Your coach is ready. What do you want to do first?
          </p>
        </div>
        <nav aria-label="Start here" className="space-y-3">
          <NextStepLink href="/training" icon="clipboard" label="Get my training plan" />
          <NextStepLink href="/games" icon="ball" label="See this week's games" />
          <NextStepLink href="/coach" icon="chat" label="Ask my coach a question" />
        </nav>
        <button
          type="button"
          onClick={() => setMode('edit')}
          className="w-full py-2 text-base font-semibold text-pitch-green underline"
        >
          Change my profile
        </button>
      </div>
    );
  }

  if (mode === 'edit') {
    return (
      <form key="edit" onSubmit={saveEdits} noValidate className="mx-auto max-w-lg space-y-8">
        <div className="space-y-2">
          <h1 ref={headingRef} tabIndex={-1} className={TITLE}>
            {editHeading(author, draft.name)}
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            Change anything here, then save. The coach, training plans and weekly games use it
            straight away.
          </p>
        </div>
        {STEPS.map((stepName) => (
          <div key={stepName} className="border-t border-gray-200 pt-6">
            {question(stepName, 'h2')}
          </div>
        ))}
        <div className="space-y-3 border-t border-gray-200 pt-6">
          {errorMessage}
          {saved && (
            <p
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              Profile saved! Your coach will use this to personalise advice.
            </p>
          )}
          <button type="submit" className={`${BUTTON_PRIMARY} w-full`}>
            Save profile
          </button>
        </div>
      </form>
    );
  }

  const last = step === STEPS.length - 1;
  return (
    <div key="setup" className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-sm font-semibold text-gray-600">
          Step {step + 1} of {STEPS.length}
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? 'bg-pitch-green' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      {question(STEPS[step], 'h1')}
      {errorMessage}
      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={goBack} className={BUTTON_SECONDARY}>
            Back
          </button>
        )}
        <button type="button" onClick={goNext} className={BUTTON_PRIMARY}>
          {last ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
