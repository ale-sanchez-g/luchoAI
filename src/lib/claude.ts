import Anthropic from '@anthropic-ai/sdk';
import type { Message, PlayerProfile, TrainingPlan } from '@/types';
import { buildSystemPrompt } from './prompts';

function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function sendMessage(
  apiKey: string,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
): Promise<string> {
  const client = createClient(apiKey);

  const messages = [
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: newUserMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: buildSystemPrompt(playerProfile),
    messages,
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

export async function generateTrainingPlan(
  apiKey: string,
  playerProfile: PlayerProfile,
): Promise<TrainingPlan> {
  const client = createClient(apiKey);

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    system: buildSystemPrompt(playerProfile),
    messages: [
      {
        role: 'user',
        content: `Create a detailed 1-week training plan for me. Include 4 sessions with specific drills, durations, and coaching points. Respond with only valid JSON matching this exact shape, no markdown:
{
  "weeklyGoal": "string",
  "sessions": [
    {
      "id": "string",
      "title": "string",
      "duration": 60,
      "focus": "string",
      "drills": [
        {
          "name": "string",
          "duration": 10,
          "description": "string",
          "coachingPoints": ["string"]
        }
      ],
      "notes": "string"
    }
  ]
}`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');

  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in training plan response');

  const parsed = JSON.parse(jsonMatch[0]) as Omit<TrainingPlan, 'generatedAt'>;
  return { ...parsed, generatedAt: new Date() };
}
