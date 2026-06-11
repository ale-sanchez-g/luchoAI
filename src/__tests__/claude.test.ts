import { sendMessage, generateTrainingPlan } from '@/lib/claude';
import type { Message, PlayerProfile } from '@/types';

const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
);

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
  });

  it('passes only the last 20 messages from history when history exceeds 20', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Great question!' }],
    });
    const history = makeHistory(25);

    await sendMessage('sk-ant-key', history, 'new message', null);

    const { messages } = mockCreate.mock.calls[0][0] as { messages: { content: string }[] };
    // 20 from history + 1 new user message = 21 total
    expect(messages).toHaveLength(21);
    // history[5] is the first message included (messages 0–4 dropped)
    expect(messages[0].content).toBe('Message 5');
    // last entry is the new user message
    expect(messages[20].content).toBe('new message');
  });

  it('includes all messages when history is within the 20-message limit', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Sure!' }],
    });
    const history = makeHistory(10);

    await sendMessage('sk-ant-key', history, 'new message', null);

    const { messages } = mockCreate.mock.calls[0][0] as { messages: unknown[] };
    expect(messages).toHaveLength(11);
  });

  it('propagates API errors as a rejected promise', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    await expect(sendMessage('sk-ant-key', [], 'hello', null)).rejects.toThrow(
      'Rate limit exceeded'
    );
  });
});

describe('generateTrainingPlan', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  function mockApiResponse(json: unknown): void {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(json) }],
    });
  }

  it('throws a validation error when the response has no sessions field', async () => {
    mockApiResponse({ weeklyGoal: 'Get fit' });

    await expect(generateTrainingPlan('sk-ant-key', SAMPLE_PROFILE)).rejects.toThrow(
      /sessions/
    );
  });

  it('throws a validation error when sessions is null', async () => {
    mockApiResponse({ weeklyGoal: 'Get fit', sessions: null });

    await expect(generateTrainingPlan('sk-ant-key', SAMPLE_PROFILE)).rejects.toThrow(
      /sessions/
    );
  });

  it('returns a valid TrainingPlan when sessions is an empty array', async () => {
    mockApiResponse({ weeklyGoal: 'Rest week', sessions: [] });

    const plan = await generateTrainingPlan('sk-ant-key', SAMPLE_PROFILE);

    expect(plan.weeklyGoal).toBe('Rest week');
    expect(plan.sessions).toEqual([]);
    expect(plan.generatedAt).toBeInstanceOf(Date);
  });

  it('parses a well-formed response and returns the expected shape', async () => {
    const rawPlan = {
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
    mockApiResponse(rawPlan);

    const plan = await generateTrainingPlan('sk-ant-key', SAMPLE_PROFILE);

    expect(plan.weeklyGoal).toBe('Improve dribbling');
    expect(plan.sessions).toHaveLength(1);
    expect(plan.sessions[0].id).toBe('s1');
    expect(plan.generatedAt).toBeInstanceOf(Date);
  });
});
