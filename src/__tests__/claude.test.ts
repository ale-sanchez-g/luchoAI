import { sendMessage, generateTrainingPlan } from '@/lib/claude';
import type { Message, PlayerProfile, AIProviderConfig } from '@/types';

const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
);

const mockOpenAICreate = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
  }))
);

const mockGeminiGenerateContent = jest.fn();
const mockGeminiSendMessage = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGeminiGenerateContent,
      startChat: jest.fn().mockReturnValue({ sendMessage: mockGeminiSendMessage }),
    }),
  })),
}));

const mockHfChatCompletion = jest.fn();
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    chatCompletion: mockHfChatCompletion,
  })),
}));

const ANTHROPIC_CONFIG: AIProviderConfig = {
  provider: 'anthropic',
  model: 'claude-opus-4-8',
  apiKey: 'sk-ant-key',
};

const OPENAI_CONFIG: AIProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'sk-openai-key',
};

const GEMINI_CONFIG: AIProviderConfig = {
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: 'AIza-test-key',
};

const HF_CONFIG: AIProviderConfig = {
  provider: 'huggingface',
  model: 'mistralai/Mistral-7B-Instruct-v0.3',
  apiKey: 'hf_test-key',
};

const SAMPLE_PROFILE: PlayerProfile = {
  name: 'Lucho',
  age: 14,
  position: 'midfielder',
  skillLevel: 'intermediate',
  goals: ['Improve passing range'],
  weaknesses: ['Weak foot'],
};

function makeHistory(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `Message ${i}`,
    timestamp: new Date(),
  }));
}

describe('sendMessage', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockOpenAICreate.mockClear();
    mockGeminiSendMessage.mockClear();
    mockHfChatCompletion.mockClear();
  });

  describe('anthropic provider', () => {
    it('passes only the last 20 messages from history when history exceeds 20', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Great question!' }],
      });
      const history = makeHistory(25);

      await sendMessage(ANTHROPIC_CONFIG, history, 'new message', null);

      const { messages } = mockCreate.mock.calls[0][0] as { messages: { content: string }[] };
      expect(messages).toHaveLength(21);
      expect(messages[0].content).toBe('Message 5');
      expect(messages[20].content).toBe('new message');
    });

    it('includes all messages when history is within the 20-message limit', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Sure!' }],
      });

      await sendMessage(ANTHROPIC_CONFIG, makeHistory(10), 'new message', null);

      const { messages } = mockCreate.mock.calls[0][0] as { messages: unknown[] };
      expect(messages).toHaveLength(11);
    });

    it('propagates API errors as a rejected promise', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await expect(sendMessage(ANTHROPIC_CONFIG, [], 'hello', null)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });

  describe('openai provider', () => {
    it('sends message using OpenAI and returns content', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'OpenAI response' } }],
      });

      const result = await sendMessage(OPENAI_CONFIG, [], 'hello', null);
      expect(result).toBe('OpenAI response');
    });

    it('throws when OpenAI returns empty content', async () => {
      mockOpenAICreate.mockResolvedValueOnce({ choices: [{ message: { content: null } }] });

      await expect(sendMessage(OPENAI_CONFIG, [], 'hello', null)).rejects.toThrow(
        'Empty response from OpenAI'
      );
    });
  });

  describe('gemini provider', () => {
    it('sends message using Gemini and returns text', async () => {
      mockGeminiSendMessage.mockResolvedValueOnce({
        response: { text: () => 'Gemini response' },
      });

      const result = await sendMessage(GEMINI_CONFIG, [], 'hello', null);
      expect(result).toBe('Gemini response');
    });
  });

  describe('huggingface provider', () => {
    it('sends message using HuggingFace and returns content', async () => {
      mockHfChatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: 'HF response' } }],
      });

      const result = await sendMessage(HF_CONFIG, [], 'hello', null);
      expect(result).toBe('HF response');
    });
  });
});

describe('generateTrainingPlan', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockOpenAICreate.mockClear();
    mockGeminiGenerateContent.mockClear();
    mockHfChatCompletion.mockClear();
  });

  const VALID_PLAN = {
    weeklyGoal: 'Improve dribbling',
    sessions: [
      {
        id: 's1',
        title: 'Dribbling session',
        duration: 60,
        focus: 'Ball control',
        drills: [
          {
            name: 'Cone weave',
            duration: 10,
            description: 'Weave through cones',
            coachingPoints: ['Keep the ball close'],
          },
        ],
        notes: 'Focus on your weaker foot',
      },
    ],
  };

  // Anthropic uses assistant prefill: the model continues from '{', so mock text omits the leading '{'
  function withoutOpeningBrace(plan: object): string {
    return JSON.stringify(plan).slice(1);
  }

  describe('anthropic provider', () => {
    it('throws a validation error when the response has no sessions field', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: withoutOpeningBrace({ weeklyGoal: 'Get fit' }) }],
      });

      await expect(generateTrainingPlan(ANTHROPIC_CONFIG, SAMPLE_PROFILE)).rejects.toThrow(
        /sessions/
      );
    });

    it('parses a well-formed response and returns the expected shape', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: withoutOpeningBrace(VALID_PLAN) }],
      });

      const plan = await generateTrainingPlan(ANTHROPIC_CONFIG, SAMPLE_PROFILE);

      expect(plan.weeklyGoal).toBe('Improve dribbling');
      expect(plan.sessions).toHaveLength(1);
      expect(plan.generatedAt).toBeInstanceOf(Date);
    });

    it('returns a valid TrainingPlan when sessions is an empty array', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: withoutOpeningBrace({ weeklyGoal: 'Rest week', sessions: [] }) }],
      });

      const plan = await generateTrainingPlan(ANTHROPIC_CONFIG, SAMPLE_PROFILE);
      expect(plan.weeklyGoal).toBe('Rest week');
      expect(plan.sessions).toEqual([]);
    });

    it('sends the assistant prefill message to force JSON output', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: withoutOpeningBrace(VALID_PLAN) }],
      });

      await generateTrainingPlan(ANTHROPIC_CONFIG, SAMPLE_PROFILE);

      const { messages } = mockCreate.mock.calls[0][0] as {
        messages: { role: string; content: string }[];
      };
      const last = messages[messages.length - 1];
      expect(last.role).toBe('assistant');
      expect(last.content).toBe('{');
    });
  });

  describe('openai provider', () => {
    it('parses a training plan from OpenAI', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(VALID_PLAN) } }],
      });

      const plan = await generateTrainingPlan(OPENAI_CONFIG, SAMPLE_PROFILE);
      expect(plan.weeklyGoal).toBe('Improve dribbling');
      expect(plan.generatedAt).toBeInstanceOf(Date);
    });

    it('requests json_object response_format', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(VALID_PLAN) } }],
      });

      await generateTrainingPlan(OPENAI_CONFIG, SAMPLE_PROFILE);

      const callArgs = mockOpenAICreate.mock.calls[0][0] as { response_format: unknown };
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
    });
  });

  describe('gemini provider', () => {
    it('parses a training plan from Gemini', async () => {
      mockGeminiGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(VALID_PLAN) },
      });

      const plan = await generateTrainingPlan(GEMINI_CONFIG, SAMPLE_PROFILE);
      expect(plan.weeklyGoal).toBe('Improve dribbling');
    });
  });

  describe('huggingface provider', () => {
    it('parses a training plan from HuggingFace', async () => {
      mockHfChatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(VALID_PLAN) } }],
      });

      const plan = await generateTrainingPlan(HF_CONFIG, SAMPLE_PROFILE);
      expect(plan.weeklyGoal).toBe('Improve dribbling');
    });
  });
});
