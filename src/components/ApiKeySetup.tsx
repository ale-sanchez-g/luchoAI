'use client';

import { useState } from 'react';
import { PROVIDERS } from '@/lib/providers';
import { setProviderConfig } from '@/lib/storage';
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
      setError(`Invalid API key format for ${provider.name}. Expected: ${provider.keyPlaceholder}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pitch-dark to-pitch-green flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome to LuchoAI</h1>
          <p className="text-gray-500 mt-2 text-sm">Choose your AI provider to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Provider selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider</label>
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
                  <span className="text-xl">{p.logo}</span>
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
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKeyValue(e.target.value);
                setError('');
              }}
              placeholder={provider.keyPlaceholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{provider.keyHint}</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-pitch-green text-white py-2 px-4 rounded-lg font-semibold hover:bg-pitch-dark transition-colors"
          >
            Start Training
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Your key is stored only in your browser and never shared.
        </p>
      </div>
    </div>
  );
}
