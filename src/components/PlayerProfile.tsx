'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { PlayerProfile } from '@/types';
import {
  PROFILE_MAX_ENTRIES,
  PROFILE_MAX_ENTRY_LENGTH,
  PROFILE_MAX_NAME_LENGTH,
  setPlayerProfile,
} from '@/lib/storage';

interface PlayerProfileFormProps {
  initialProfile: PlayerProfile | null;
  onSave: (profile: PlayerProfile) => void;
}

const POSITIONS: PlayerProfile['position'][] = ['goalkeeper', 'defender', 'midfielder', 'forward'];
const AGES: number[] = Array.from({ length: 11 }, (_, i) => 8 + i);
const LEVELS:PlayerProfile['skillLevel'][] = ['beginner', 'intermediate', 'advanced'];

interface ListEntryProps {
  value: string;
  placeholder: string;
  removeLabel: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}

// A textarea that grows with its text, so a long goal is never hidden behind a scrolling
// one-line box. The remove cross sits inside the box; the right padding keeps text clear of it.
function ListEntry({ value, placeholder, removeLabel, onChange, onRemove }: ListEntryProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [value]);

  return (
    <div className="relative mb-2">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\s*\n+\s*/g, ' '))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        placeholder={placeholder}
        maxLength={PROFILE_MAX_ENTRY_LENGTH}
        className="block w-full min-w-0 resize-none overflow-hidden border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-base leading-6"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute top-px right-px w-10 h-10 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-red-600"
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

export default function PlayerProfileForm({ initialProfile, onSave }: PlayerProfileFormProps) {
  const [profile, setProfile] = useState<PlayerProfile>(() => ({
    name: '',
    age: 12,
    position: 'midfielder',
    skillLevel: 'beginner',
    ...initialProfile,
    goals: initialProfile?.goals.length ? initialProfile.goals : [''],
    weaknesses: initialProfile?.weaknesses.length ? initialProfile.weaknesses : [''],
  }));

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const cleaned = {
      ...profile,
      name: profile.name.trim(),
      goals: profile.goals.map((g) => g.trim()).filter(Boolean),
      weaknesses: profile.weaknesses.map((w) => w.trim()).filter(Boolean),
    };
    setPlayerProfile(cleaned);
    onSave(cleaned);
  }

  function updateList(field: 'goals' | 'weaknesses', index: number, value: string): void {
    setProfile((prev) => {
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  }

  function addToList(field: 'goals' | 'weaknesses'): void {
    setProfile((prev) => ({ ...prev, [field]: [...prev[field], ''] }));
  }

  function removeFromList(field: 'goals' | 'weaknesses', index: number): void {
    setProfile((prev) => {
      const remaining = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: remaining.length > 0 ? remaining : [''] };
    });
  }

  function renderList(field: 'goals' | 'weaknesses', placeholder: string, noun: string) {
    return profile[field].map((value, i) => (
      <ListEntry
        key={i}
        value={value}
        placeholder={`${placeholder} ${i + 1}`}
        removeLabel={`Remove ${noun} ${i + 1}`}
        onChange={(v) => updateList(field, i, v)}
        onRemove={() => removeFromList(field, i)}
      />
    ));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="w-full min-w-0 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-base"
            maxLength={PROFILE_MAX_NAME_LENGTH}
            pattern=".*\S.*"
            title="Please enter your name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <select
            value={profile.age}
            onChange={(e) => setProfile((p) => ({ ...p, age: Number(e.target.value) }))}
            className="w-full min-w-0 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-base"
            required
          >
            {AGES.map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          <select
            value={profile.position}
            onChange={(e) =>
              setProfile((p) => ({ ...p, position: e.target.value as PlayerProfile['position'] }))
            }
            className="w-full min-w-0 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-base"
          >
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
          <select
            value={profile.skillLevel}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                skillLevel: e.target.value as PlayerProfile['skillLevel'],
              }))
            }
            className="w-full min-w-0 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-base"
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Goals</label>
        {renderList('goals', 'Goal', 'goal')}
        {profile.goals.length < PROFILE_MAX_ENTRIES && (
          <button
            type="button"
            onClick={() => addToList('goals')}
            className="text-base text-pitch-green hover:underline"
          >
            + Add goal
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Areas to improve</label>
        {renderList('weaknesses', 'Area', 'area')}
        {profile.weaknesses.length < PROFILE_MAX_ENTRIES && (
          <button
            type="button"
            onClick={() => addToList('weaknesses')}
            className="text-base text-pitch-green hover:underline"
          >
            + Add area
          </button>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-pitch-green text-white py-2 px-4 rounded-lg font-semibold hover:bg-pitch-dark transition-colors"
      >
        Save Profile
      </button>
    </form>
  );
}
