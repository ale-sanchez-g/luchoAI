import type { AIProvider, AIProviderConfig } from '@/types';
import type { IconName } from '@/lib/icons';

export interface AIModel {
  id: string;
  name: string;
  description: string;
}

export interface ProviderDefinition {
  id: AIProvider;
  name: string;
  logo: IconName;
  description: string;
  keyPlaceholder: string;
  keyValidation: (key: string) => boolean;
  keyHint: string;
  models: AIModel[];
  defaultModel: string;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    logo: 'brain',
    description: "Anthropic's Claude — thoughtful, detailed coaching advice",
    keyPlaceholder: 'sk-ant-...',
    keyValidation: (k) => k.startsWith('sk-ant-'),
    keyHint: 'Get your key at console.anthropic.com',
    models: [
      { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', description: 'Most powerful' },
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', description: 'Fast & capable' },
      { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', description: 'Fastest & lightest' },
    ],
    defaultModel: 'claude-opus-5-5',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    logo: 'robot',
    description: "OpenAI's GPT models — well known and widely used",
    keyPlaceholder: 'sk-...',
    keyValidation: (k) => k.startsWith('sk-') && !k.startsWith('sk-ant-'),
    keyHint: 'Get your key at platform.openai.com',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: 'Fast & affordable' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Advanced reasoning' },
    ],
    defaultModel: 'gpt-4o',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    logo: 'sparkles',
    description: "Google's Gemini — fast and capable",
    keyPlaceholder: 'AIza...',
    keyValidation: (k) => k.length > 20,
    keyHint: 'Get your key at aistudio.google.com',
    models: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Latest, fast & capable' },
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Fast & capable' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Fast & capable' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', description: 'Fastest & lightest' },
    ],
    defaultModel: 'gemini-3.6-flash',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    logo: 'hug',
    description: 'Open models via Hugging Face Inference Providers',
    keyPlaceholder: 'hf_...',
    keyValidation: (k) => k.startsWith('hf_'),
    keyHint: 'Get your token at huggingface.co/settings/tokens',
    // Requests go to whichever Inference Provider currently serves the model, so only list
    // models that several providers host. Checked 2026-11-25 against the provider mapping on
    // huggingface.co/docs/inference-providers/en/tasks/chat-completion: gpt-oss-120b (3
    // providers), GLM-5.3 (5), DeepSeek-V4.1-Flash-1017 (5), Qwen3.8-27B (4). Llama 3.1 8B was
    // dropped: two providers left and it is gated, so each account had to accept Meta's licence.
    models: [
      {
        id: 'openai/gpt-oss-120b',
        name: 'gpt-oss 120B',
        description: 'Most capable',
      },
      {
        id: 'zai-org/GLM-5.3',
        name: 'GLM 5.3',
        description: 'Latest, capable',
      },
      {
        id: 'deepseek-ai/DeepSeek-V4.1-Flash-1017',
        name: 'DeepSeek V4.1 Flash',
        description: 'Fast & affordable',
      },
      {
        id: 'Qwen/Qwen3.8-27B',
        name: 'Qwen 3.8 27B',
        description: 'Fastest & lightest',
      },
    ],
    defaultModel: 'openai/gpt-oss-120b',
  },
];

// The cheapest Gemini model: free training plans run on it so the shared key lasts longer.
export const FREE_PLAN_MODEL = 'gemini-3.5-flash-lite';

export function getProvider(id: AIProvider): ProviderDefinition {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

/**
 * Swaps a model that is no longer offered for the provider's default, so a setup saved
 * before a model was retired keeps working instead of failing on every request.
 */
export function withSupportedModel(config: AIProviderConfig): AIProviderConfig {
  const provider = getProvider(config.provider);
  return provider.models.some((m) => m.id === config.model)
    ? config
    : { ...config, model: provider.defaultModel };
}
