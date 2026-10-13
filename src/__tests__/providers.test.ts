import { PROVIDERS, withSupportedModel } from '@/lib/providers';
import type { AIProviderConfig } from '@/types';

describe('providers', () => {
  it.each(PROVIDERS.map((p) => [p.id, p] as const))(
    '%s lists its default model in the dropdown',
    (_id, provider) => {
      expect(provider.models.map((m) => m.id)).toContain(provider.defaultModel);
    },
  );

  describe('withSupportedModel', () => {
    const saved: AIProviderConfig = {
      provider: 'huggingface',
      model: 'openai/gpt-oss-20b',
      apiKey: 'hf_test-key',
    };

    it('keeps a model that is still offered', () => {
      expect(withSupportedModel(saved)).toEqual(saved);
    });

    it('swaps a retired model for the provider default and keeps the key', () => {
      expect(withSupportedModel({ ...saved, model: 'HuggingFaceH4/zephyr-7b-beta' })).toEqual({
        provider: 'huggingface',
        model: 'openai/gpt-oss-120b',
        apiKey: 'hf_test-key',
      });
    });

    it('leaves other providers on their saved model when it is listed', () => {
      const anthropic: AIProviderConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        apiKey: 'sk-ant-test',
      };
      expect(withSupportedModel(anthropic)).toBe(anthropic);
    });
  });
});
