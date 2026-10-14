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
    description: "Anthropic's Claude — best for nuanced coaching advice",
    keyPlaceholder: 'sk-ant-...',
    keyValidation: (k) => k.startsWith('sk-ant-'),
    keyHint: 'Get your key at console.anthropic.com',
    models: [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', description: 'Most powerful' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: 'Fast & capable' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fastest & lightest' },
    ],
    defaultModel: 'claude-opus-4-8',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    logo: 'robot',
    description: "OpenAI's GPT models — industry-leading performance",
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
    description: "Google's Gemini — multimodal and highly capable",
    keyPlaceholder: 'AIza...',
    keyValidation: (k) => k.length > 20,
    keyHint: 'Get your key at aistudio.google.com',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Latest, fastest' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast & efficient' },
    ],
    defaultModel: 'gemini-2.0-flash',
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
    // models that several providers host. Checked 2026-10-13: Mistral 7B and Zephyr 7B had
    // no provider left. Llama is gated, so each account must accept Meta's licence first.
    models: [
      {
        id: 'openai/gpt-oss-120b',
        name: 'gpt-oss 120B',
        description: 'Most capable',
      },
      {
        id: 'openai/gpt-oss-20b',
        name: 'gpt-oss 20B',
        description: 'Fast & affordable',
      },
      {
        id: 'meta-llama/Llama-3.1-8B-Instruct',
        name: 'Llama 3.1 8B',
        description: 'Needs Meta licence',
      },
    ],
    defaultModel: 'openai/gpt-oss-120b',
  },
];

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
