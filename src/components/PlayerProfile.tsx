'use client';

import { useState } from 'react';
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
      <div key={i} className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={value}
          onChange={(e) => updateList(field, i, e.target.value)}
          placeholder={`${placeholder} ${i + 1}`}
          maxLength={PROFILE_MAX_ENTRY_LENGTH}
          className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-base"
        />
        <button
          type="button"
          onClick={() => removeFromList(field, i)}
          aria-label={`Remove ${noun} ${i + 1}`}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
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
