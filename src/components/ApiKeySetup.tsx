'use client';

import { useState } from 'react';
import { setApiKey } from '@/lib/storage';

interface ApiKeySetupProps {
  onKeySet: () => void;
}

export default function ApiKeySetup({ onKeySet }: ApiKeySetupProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!key.trim().startsWith('sk-ant-')) {
      setError('Key must start with sk-ant-');
      return;
    }
    setApiKey(key.trim());
    onKeySet();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pitch-dark to-pitch-green flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome to LuchoAI</h1>
          <p className="text-gray-500 mt-2 text-sm">Your personal AI football coach</p>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          Enter your Anthropic API key to get started. It is stored only in your browser and sent
          exclusively to Anthropic when you chat.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Anthropic API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError('');
              }}
              placeholder="sk-ant-..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-pitch-green text-white py-2 px-4 rounded-lg font-semibold hover:bg-pitch-dark transition-colors"
          >
            Start Training
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">Get your key at console.anthropic.com</p>
      </div>
    </div>
  );
}
