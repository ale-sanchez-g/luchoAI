'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  DecisionThemeId,
  PickReason,
  PlayerProfile,
  PlaySlot,
  WeeklyPick,
  WeeklyPlan,
} from '@/types';
import { getTheme } from '@/lib/decision-games';
import { getLibraryStats, getWeeklyPlan } from '@/lib/game-library';
import { profileMentionsHeading } from '@/lib/game-library/safety';
import { getSkillArea } from '@/lib/game-library/skills';
import { getPlayerProfile } from '@/lib/storage';

const CARD = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';
const CHIP = 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700';

const SLOT_LABEL: Record<PlaySlot, string> = {
  solo: 'On your own',
  friend: 'With a friend',
  team: 'With a group',
  wildcard: 'Something new',
};

const REASON_LABEL: Record<PickReason, string> = {
  goal: 'Matches your goals',
  position: 'Good for your position',
  new: 'Try something new',
};

function formatPlayers([min, max]: [number, number]): string {
  if (max === 1) return 'On your own';
  if (min === 1) return `On your own or up to ${max}`;
  return min === max ? `${min} players` : `${min}-${max} players`;
}

function formatWeek(start: Date): string {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const day = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
  return `${day.format(start)} to ${day.format(end)}`;
}

function DetailRow({ term, text }: { term: string; text: string }) {
  return (
    <div>
      <dt className="font-semibold text-gray-800">{term}</dt>
      <dd className="text-gray-600">{text}</dd>
    </div>
  );
}

function GameCard({ pick, defaultOpen }: { pick: WeeklyPick; defaultOpen: boolean }) {
  const { game, twist } = pick;
  const skill = getSkillArea(game.skill);
  return (
    <details open={defaultOpen} className={`${CARD} group`}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="block text-xs font-semibold uppercase tracking-wide text-pitch-green">
          {SLOT_LABEL[pick.slot]}
        </span>
        <span className="mt-1 flex items-start justify-between gap-3">
          <h3 className="font-bold text-gray-800">{game.name}</h3>
          <span
            aria-hidden="true"
            className="text-gray-400 transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <span className={CHIP}>
            <span aria-hidden="true">{skill.emoji}</span> {skill.label}
          </span>
          <span className={CHIP}>{formatPlayers(game.players)}</span>
          <span className={CHIP}>{game.minutes} min</span>
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-pitch-dark">
            {REASON_LABEL[pick.reason]}
          </span>
        </span>
      </summary>
      <dl className="mt-3 space-y-2 text-sm">
        <DetailRow term="Set up" text={game.setup} />
        <DetailRow term="How to play" text={game.howToPlay} />
        <DetailRow term="Focus" text={game.focus} />
        {twist && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <dt className="font-semibold text-amber-900">Twist of the week: {twist.name}</dt>
            <dd className="text-amber-900">{twist.rule}</dd>
          </div>
        )}
        <DetailRow term="Make it easier" text={game.easier} />
        <DetailRow term="Make it harder" text={game.harder} />
      </dl>
    </details>
  );
}

function focusNote(plan: WeeklyPlan, profile: PlayerProfile | null): string {
  if (plan.focusSource === 'goals') {
    return profile?.name ? `Picked from your goals, ${profile.name}.` : 'Picked from your goals.';
  }
  if (plan.focusSource === 'position') {
    return `Picked for a ${profile?.position ?? 'player'}.`;
  }
  return 'A different skill each week, so you try everything.';
}

interface WeeklyGamesProps {
  onPlayRound: (id: DecisionThemeId) => void;
}

export default function WeeklyGames({ onPlayRound }: WeeklyGamesProps) {
  const [loaded, setLoaded] = useState<{ plan: WeeklyPlan; profile: PlayerProfile | null } | null>(
    null,
  );

  // The week and the player's goals only exist in the browser, so the first render is empty.
  useEffect(() => {
    const profile = getPlayerProfile();
    setLoaded({ plan: getWeeklyPlan(new Date(), profile), profile });
  }, []);

  if (!loaded) {
    return (
      <p role="status" className="text-sm text-gray-500">
        Loading this week&apos;s games…
      </p>
    );
  }

  const { plan, profile } = loaded;
  const focus = getSkillArea(plan.focus);
  const theme = getTheme(plan.quizTheme);
  const stats = getLibraryStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">This week&apos;s games</h1>
        <p className="mt-1 text-sm text-gray-600">
          {formatWeek(plan.startsOn)} · A new set every Monday
        </p>
      </div>

      <div className="rounded-2xl bg-pitch-dark p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-200">
          This week&apos;s focus
        </p>
        <p className="mt-1 text-xl font-bold">
          <span aria-hidden="true">{focus.emoji}</span> {focus.label}
        </p>
        <p className="mt-1 text-sm text-green-100">{focusNote(plan, profile)}</p>
        {plan.focusSource !== 'goals' && (
          <p className="mt-2 text-sm text-green-100">
            Add your goals on the{' '}
            <Link href="/profile" className="font-semibold text-yellow-300 underline">
              Profile page
            </Link>{' '}
            and the games will be picked to match.
          </p>
        )}
      </div>

      {profileMentionsHeading(profile) && (
        <p
          role="note"
          className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
        >
          Heading is best practised at training with your coach, who can keep it safe for your
          age. These games build the touch and timing you will need for it.
        </p>
      )}

      <section aria-labelledby="week-games-heading" className="space-y-3">
        <h2 id="week-games-heading" className="font-bold text-gray-800">
          <span aria-hidden="true">⚽</span> Play these this week
        </h2>
        {plan.picks.map((pick, i) => (
          <GameCard key={pick.game.id} pick={pick} defaultOpen={i === 0} />
        ))}
        <p className="text-sm text-gray-600">
          Play where it is safe: away from roads, driveways, car parks and windows. Tell a
          grown-up where you are (if you are under 10, keep one in sight) and bring water. Stop
          if anything hurts. If you bang your head or feel dizzy, sick or confused, stop and tell
          a grown-up straight away. Rest days help you grow, so take one or two off each week.
        </p>
      </section>

      {plan.mission && (
        <section aria-labelledby="mission-heading" className={`${CARD} border-pitch-green`}>
          <h2 id="mission-heading" className="font-bold text-gray-800">
            <span aria-hidden="true">🏟️</span> Take it to your next match
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            One small thing to try in a real game. You are in control of it, win or lose.
          </p>
          <h3 className="mt-3 font-semibold text-pitch-dark">{plan.mission.title}</h3>
          <p className="text-sm text-gray-700">{plan.mission.mission}</p>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">Why it helps:</span> {plan.mission.why}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">After the match:</span>{' '}
            {plan.mission.afterMatch}
          </p>
        </section>
      )}

      <section aria-labelledby="week-iq-heading" className={CARD}>
        <h2 id="week-iq-heading" className="font-bold text-gray-800">
          <span aria-hidden="true">🧠</span> Game IQ round of the week
        </h2>
        <p className="mt-1 text-sm text-gray-700">
          <span aria-hidden="true">{theme.emoji}</span> <strong>{theme.title}</strong>:{' '}
          {theme.description}
        </p>
        <button
          type="button"
          onClick={() => onPlayRound(theme.id)}
          className="mt-3 rounded-lg bg-pitch-green px-5 py-2 font-semibold text-white transition-colors hover:bg-pitch-dark"
        >
          Play this round
        </button>
      </section>

      <p className="text-xs text-gray-500">
        {stats.games} games and {stats.waysToPlay.toLocaleString()} ways to play so far, with more
        on the way.
      </p>
    </div>
  );
}
