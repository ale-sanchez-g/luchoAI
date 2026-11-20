'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PROVIDERS } from '@/lib/providers';
import ErrorMessage from './ErrorMessage';
import Icon from './Icon';
import { getFreeKey } from '@/lib/free-key';
import { getFreePlansLeft, getFreeQuestionsLeft, setProviderConfig } from '@/lib/storage';
import type { AIProvider, AIProviderConfig } from '@/types';

interface ApiKeySetupProps {
  onKeySet: () => void;
}

export default function ApiKeySetup({ onKeySet }: ApiKeySetupProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('anthropic');
  const [selectedModel, setSelectedModel] = useState<string>(PROVIDERS[0].defaultModel);
  const [apiKey, setApiKeyValue] = useState('');
  const [error, setError] = useState('');

  const provider = PROVIDERS.find((p) => p.id === selectedProvider)!;
  const freeQuestionsLeft = getFreeQuestionsLeft();
  const freePlansLeft = getFreePlansLeft();

  function handleProviderChange(id: AIProvider): void {
    setSelectedProvider(id);
    const def = PROVIDERS.find((p) => p.id === id)!;
    setSelectedModel(def.defaultModel);
    setApiKeyValue('');
    setError('');
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!provider.keyValidation(apiKey.trim())) {
      setError(`That key doesn't look right for ${provider.name}. It should look like ${provider.keyPlaceholder}`);
      return;
    }
    const config: AIProviderConfig = {
      provider: selectedProvider,
      model: selectedModel,
      apiKey: apiKey.trim(),
    };
    setProviderConfig(config);
    onKeySet();
  }

  function startFree(): void {
    setProviderConfig({
      provider: 'gemini',
      model: PROVIDERS.find((p) => p.id === 'gemini')!.defaultModel,
      apiKey: '',
      free: true,
    });
    onKeySet();
  }

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-gradient-to-br from-pitch-dark to-pitch-green p-3 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <div className="text-center mb-6">
          <div className="mb-3">
            <Icon name="ball" size={80} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome to LuchoAI</h1>
          <p className="text-gray-500 mt-2 text-sm">Choose your AI provider to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Provider selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI provider</label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all text-sm ${
                    selectedProvider === p.id
                      ? 'border-pitch-green bg-pitch-green/5 text-pitch-dark font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Icon name={p.logo} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{provider.description}</p>
          </div>

          {/* Model selection */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
            >
              {provider.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* API key input */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              AI key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKeyValue(e.target.value);
                setError('');
              }}
              onFocus={(e) => {
                // Wait for the on-screen keyboard to open, then bring the field above it.
                const field = e.currentTarget;
                setTimeout(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
              }}
              placeholder={provider.keyPlaceholder}
              autoComplete="off"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-base sm:text-sm"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{provider.keyHint}</p>
          </div>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <button
            type="submit"
            className="w-full bg-pitch-green text-white py-2 px-4 rounded-lg font-semibold hover:bg-pitch-dark transition-colors"
          >
            Start training
          </button>
        </form>

        {getFreeKey() && (freeQuestionsLeft > 0 || freePlansLeft > 0) && (
          <div className="mt-4 border-t pt-4 text-center">
            <button
              type="button"
              onClick={startFree}
              className="w-full rounded-lg border-2 border-pitch-green py-2 px-4 font-semibold text-pitch-dark hover:bg-pitch-green/5"
            >
              Try it free
            </button>
            <p className="mt-1 text-xs text-gray-500">
              No key needed. {freeQuestionsLeft} {freeQuestionsLeft === 1 ? 'question' : 'questions'}{' '}
              and {freePlansLeft} training {freePlansLeft === 1 ? 'plan' : 'plans'}, powered by
              Google Gemini.
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-gray-500">
          Your key is stored only in your browser. It is only ever sent to the AI company you
          choose.{' '}
          <Link href="/privacy" className="whitespace-nowrap font-semibold text-pitch-green underline">
            Read the privacy page
          </Link>
        </p>
      </div>
    </div>
  );
}
