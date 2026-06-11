'use client';

import { useState } from 'react';
import type { PlayerProfile } from '@/types';
import { setPlayerProfile } from '@/lib/storage';

interface PlayerProfileFormProps {
  initialProfile: PlayerProfile | null;
  onSave: (profile: PlayerProfile) => void;
}

const POSITIONS: PlayerProfile['position'][] = ['goalkeeper', 'defender', 'midfielder', 'forward'];
const LEVELS: PlayerProfile['skillLevel'][] = ['beginner', 'intermediate', 'advanced'];

export default function PlayerProfileForm({ initialProfile, onSave }: PlayerProfileFormProps) {
  const [profile, setProfile] = useState<PlayerProfile>(
    initialProfile ?? {
      name: '',
      age: 12,
      position: 'midfielder',
      skillLevel: 'beginner',
      goals: [''],
      weaknesses: [''],
    },
  );

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const cleaned = {
      ...profile,
      goals: profile.goals.filter(Boolean),
      weaknesses: profile.weaknesses.filter(Boolean),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input
            type="number"
            min={8}
            max={18}
            value={profile.age}
            onChange={(e) => setProfile((p) => ({ ...p, age: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
            required
          />
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
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
        {profile.goals.map((g, i) => (
          <input
            key={i}
            type="text"
            value={g}
            onChange={(e) => updateList('goals', i, e.target.value)}
            placeholder={`Goal ${i + 1}`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
          />
        ))}
        <button
          type="button"
          onClick={() => addToList('goals')}
          className="text-sm text-pitch-green hover:underline"
        >
          + Add goal
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Areas to improve</label>
        {profile.weaknesses.map((w, i) => (
          <input
            key={i}
            type="text"
            value={w}
            onChange={(e) => updateList('weaknesses', i, e.target.value)}
            placeholder={`Area ${i + 1}`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
          />
        ))}
        <button
          type="button"
          onClick={() => addToList('weaknesses')}
          className="text-sm text-pitch-green hover:underline"
        >
          + Add area
        </button>
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
