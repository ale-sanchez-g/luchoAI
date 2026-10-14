'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { DecisionThemeId } from '@/types';
import DecisionGame from './DecisionGame';
import WeeklyGames from './WeeklyGames';

type TabId = 'week' | 'iq';

interface TabInfo {
  id: TabId;
  label: string;
}

const TABS: TabInfo[] = [
  { id: 'week', label: 'This week' },
  { id: 'iq', label: 'Game IQ' },
];

export default function GamesHub() {
  const [tab, setTab] = useState<TabId>('week');
  const [round, setRound] = useState<{ themeId: DecisionThemeId | null; key: number }>({
    themeId: null,
    key: 0,
  });
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ week: null, iq: null });

  // Starting a round from the weekly page remounts Game IQ straight into that round.
  function playRound(themeId: DecisionThemeId): void {
    setRound((r) => ({ themeId, key: r.key + 1 }));
    setTab('iq');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const step = e.key === 'ArrowRight' ? 1 : TABS.length - 1;
    const next = TABS[(index + step) % TABS.length];
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Games"
        className="grid grid-cols-2 gap-1 rounded-xl bg-gray-200 p-1"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            id={`games-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`games-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-white text-pitch-dark shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="games-panel-week"
        aria-labelledby="games-tab-week"
        hidden={tab !== 'week'}
      >
        <WeeklyGames onPlayRound={playRound} />
      </div>
      <div
        role="tabpanel"
        id="games-panel-iq"
        aria-labelledby="games-tab-iq"
        hidden={tab !== 'iq'}
      >
        <DecisionGame key={round.key} initialThemeId={round.themeId} />
      </div>
    </div>
  );
}
