import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import { jsonrepair } from 'jsonrepair';
import type { Message, PlayerProfile, TrainingPlan, AIProviderConfig } from '@/types';
import { buildSystemPrompt } from './prompts';
import { FREE_PLAN_MODEL, withSupportedModel } from './providers';
import type { ContextMessage } from './context';
import { getFreeKey } from './free-key';
import { screenCoachReply, screenPlayerMessage } from './guardrails';
import {
  getFreePlansLeft,
  getFreeQuestionsLeft,
  spendFreePlan,
  spendFreeQuestion,
} from './storage';

const MAX_CONTEXT_MESSAGES = 20;

export const FREE_LIMIT_MESSAGE =
  'You have used your free questions. Add your own API key to keep going.';

export const FREE_PLAN_LIMIT_MESSAGE =
  'You have used your free training plans. Add your own API key to make more.';

// Free questions and plans run on Gemini with the key baked in at build time; the count is
// checked before the call and only spent once it succeeds. Plans use the cheapest model.
async function withFreeAllowance<T>(
  config: AIProviderConfig,
  kind: 'question' | 'plan',
  run: (resolved: AIProviderConfig) => Promise<T>,
): Promise<T> {
  if (!config.free) return run(config);
  const key = getFreeKey();
  if (!key) throw new Error('Free questions are not available right now.');
  const isPlan = kind === 'plan';
  if ((isPlan ? getFreePlansLeft() : getFreeQuestionsLeft()) <= 0) {
    throw new Error(isPlan ? FREE_PLAN_LIMIT_MESSAGE : FREE_LIMIT_MESSAGE);
  }
  const model = isPlan ? FREE_PLAN_MODEL : config.model;
  const result = await run({ ...config, provider: 'gemini', apiKey: key, model });
  if (isPlan) spendFreePlan();
  else spendFreeQuestion();
  return result;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateTrainingPlan(parsed: unknown): Omit<TrainingPlan, 'generatedAt'> {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid training plan: expected an object');
  }
  const p = parsed as Record<string, unknown>;
  if (typeof p.weeklyGoal !== 'string') {
    throw new Error('Invalid training plan: weeklyGoal must be a string');
  }
  if (!Array.isArray(p.sessions)) {
    throw new Error('Invalid training plan: sessions must be an array');
  }
  return p as Omit<TrainingPlan, 'generatedAt'>;
}

// Even when told to reply with JSON only, models sometimes wrap it in a ```json fence or add a
// sentence around it, so parse the outermost {...} span and repair near-valid JSON.
function parsePlanJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const json = start !== -1 && end > start ? text.slice(start, end + 1) : text;
  try {
    return JSON.parse(json);
  } catch {
    return JSON.parse(jsonrepair(json));
  }
}

const TRAINING_PLAN_PROMPT = `Create a personalised 1-week football training plan with exactly 4 sessions.

Output ONLY a single raw JSON object — no markdown, no code fences, no text before or after the JSON.
Your entire response must start with { and end with }.

Required JSON schema (all fields are required):
{
  "weeklyGoal": "One sentence describing the week's main focus",
  "sessions": [
    {
      "id": "session-1",
      "title": "Session name",
      "duration": 60,
      "focus": "Main technical focus",
      "drills": [
        {
          "name": "Drill name",
          "duration": 10,
          "description": "What to do",
          "coachingPoints": ["Coaching tip 1", "Coaching tip 2"]
        }
      ],
      "notes": "Overall session tip"
    }
  ]
}`;

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function sendMessageAnthropic(
  config: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
  contextMessages: ContextMessage[] = [],
): Promise<string> {
  const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  const context = history.slice(-MAX_CONTEXT_MESSAGES);
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 1024,
    system: buildSystemPrompt(playerProfile),
    messages: [
      ...contextMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ...context.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: newUserMessage },
    ],
  });
  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

async function generateTrainingPlanAnthropic(
  config: AIProviderConfig,
  playerProfile: PlayerProfile,
  contextMessages: ContextMessage[] = [],
): Promise<TrainingPlan> {
  const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  // No assistant prefill: Claude Opus 4.6+ and Sonnet 4.6 reject a request that ends on an
  // assistant turn, so the JSON-only instruction in TRAINING_PLAN_PROMPT does that job instead.
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 2048,
    system: buildSystemPrompt(playerProfile),
    messages: [
      ...contextMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: TRAINING_PLAN_PROMPT },
    ],
  });
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Unexpected response type');
  const plan = validateTrainingPlan(parsePlanJson(block.text));
  return { ...plan, generatedAt: new Date() };
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function sendMessageOpenAI(
  config: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
  contextMessages: ContextMessage[] = [],
): Promise<string> {
  const client = new OpenAI({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  const context = history.slice(-MAX_CONTEXT_MESSAGES);
  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: buildSystemPrompt(playerProfile) },
      ...contextMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ...context.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: newUserMessage },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return content;
}

async function generateTrainingPlanOpenAI(
  config: AIProviderConfig,
  playerProfile: PlayerProfile,
  contextMessages: ContextMessage[] = [],
): Promise<TrainingPlan> {
  const client = new OpenAI({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(playerProfile) },
      ...contextMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: TRAINING_PLAN_PROMPT },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  const plan = validateTrainingPlan(JSON.parse(content));
  return { ...plan, generatedAt: new Date() };
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function sendMessageGemini(
  config: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
  contextMessages: ContextMessage[] = [],
): Promise<string> {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: buildSystemPrompt(playerProfile),
  });
  const context = history.slice(-MAX_CONTEXT_MESSAGES);
  const chat = model.startChat({
    history: [
      ...contextMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      ...context.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ],
  });
  const result = await chat.sendMessage(newUserMessage);
  return result.response.text();
}

async function generateTrainingPlanGemini(
  config: AIProviderConfig,
  playerProfile: PlayerProfile,
  contextMessages: ContextMessage[] = [],
): Promise<TrainingPlan> {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: buildSystemPrompt(playerProfile),
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent({
    contents: [
      ...contextMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: TRAINING_PLAN_PROMPT }] },
    ],
  });
  const plan = validateTrainingPlan(JSON.parse(result.response.text()));
  return { ...plan, generatedAt: new Date() };
}

// ─── Hugging Face ─────────────────────────────────────────────────────────────

async function sendMessageHuggingFace(
  config: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
  contextMessages: ContextMessage[] = [],
): Promise<string> {
  const hf = new HfInference(config.apiKey);
  const context = history.slice(-MAX_CONTEXT_MESSAGES);
  const response = await hf.chatCompletion({
    model: config.model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: buildSystemPrompt(playerProfile) },
      ...contextMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ...context.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: newUserMessage },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from Hugging Face');
  return content;
}

async function generateTrainingPlanHuggingFace(
  config: AIProviderConfig,
  playerProfile: PlayerProfile,
  contextMessages: ContextMessage[] = [],
): Promise<TrainingPlan> {
  const hf = new HfInference(config.apiKey);
  const response = await hf.chatCompletion({
    model: config.model,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: buildSystemPrompt(playerProfile) },
      ...contextMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: TRAINING_PLAN_PROMPT },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from Hugging Face');
  // Small open-source models often produce near-valid JSON (missing commas, unescaped
  // newlines in strings, trailing commas). jsonrepair fixes these without a custom parser.
  const plan = validateTrainingPlan(JSON.parse(jsonrepair(content)));
  return { ...plan, generatedAt: new Date() };
}

// ─── Unified Public API ───────────────────────────────────────────────────────

export async function sendMessage(
  savedConfig: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
  contextMessages: ContextMessage[] = [],
): Promise<string> {
  const blockedReply = screenPlayerMessage(newUserMessage);
  if (blockedReply) return blockedReply;
  const reply = await withFreeAllowance(savedConfig, 'question', (resolved) =>
    dispatchSendMessage(withSupportedModel(resolved), history, newUserMessage, playerProfile, contextMessages),
  );
  return screenCoachReply(reply);
}

function dispatchSendMessage(
  providerConfig: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
  contextMessages: ContextMessage[],
): Promise<string> {
  switch (providerConfig.provider) {
    case 'anthropic':
      return sendMessageAnthropic(providerConfig, history, newUserMessage, playerProfile, contextMessages);
    case 'openai':
      return sendMessageOpenAI(providerConfig, history, newUserMessage, playerProfile, contextMessages);
    case 'gemini':
      return sendMessageGemini(providerConfig, history, newUserMessage, playerProfile, contextMessages);
    case 'huggingface':
      return sendMessageHuggingFace(providerConfig, history, newUserMessage, playerProfile, contextMessages);
  }
}

export async function generateTrainingPlan(
  savedConfig: AIProviderConfig,
  playerProfile: PlayerProfile,
  contextMessages: ContextMessage[] = [],
): Promise<TrainingPlan> {
  return withFreeAllowance(savedConfig, 'plan', (resolved) =>
    dispatchTrainingPlan(withSupportedModel(resolved), playerProfile, contextMessages),
  );
}

function dispatchTrainingPlan(
  providerConfig: AIProviderConfig,
  playerProfile: PlayerProfile,
  contextMessages: ContextMessage[],
): Promise<TrainingPlan> {
  switch (providerConfig.provider) {
    case 'anthropic':
      return generateTrainingPlanAnthropic(providerConfig, playerProfile, contextMessages);
    case 'openai':
      return generateTrainingPlanOpenAI(providerConfig, playerProfile, contextMessages);
    case 'gemini':
      return generateTrainingPlanGemini(providerConfig, playerProfile, contextMessages);
    case 'huggingface':
      return generateTrainingPlanHuggingFace(providerConfig, playerProfile, contextMessages);
  }
}
