import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import type { Message, PlayerProfile, TrainingPlan, AIProviderConfig } from '@/types';
import { buildSystemPrompt } from './prompts';

const MAX_CONTEXT_MESSAGES = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJSON(text: string): string {
  // Prefer JSON inside a markdown code fence (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) return fenceMatch[1];

  // Find the outermost JSON object by tracking brace depth instead of a greedy regex
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error('Unterminated JSON object in response');
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

const TRAINING_PLAN_PROMPT = `Create a detailed 1-week training plan for me. Include 4 sessions with specific drills, durations, and coaching points. Respond with only valid JSON matching this exact shape, no markdown:
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
}`;

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function sendMessageAnthropic(
  config: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
): Promise<string> {
  const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  const context = history.slice(-MAX_CONTEXT_MESSAGES);
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 1024,
    system: buildSystemPrompt(playerProfile),
    messages: [
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
): Promise<TrainingPlan> {
  const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 2048,
    system: buildSystemPrompt(playerProfile),
    messages: [{ role: 'user', content: TRAINING_PLAN_PROMPT }],
  });
  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');
  const plan = validateTrainingPlan(JSON.parse(extractJSON(block.text)));
  return { ...plan, generatedAt: new Date() };
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function sendMessageOpenAI(
  config: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
): Promise<string> {
  const client = new OpenAI({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  const context = history.slice(-MAX_CONTEXT_MESSAGES);
  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: buildSystemPrompt(playerProfile) },
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
): Promise<TrainingPlan> {
  const client = new OpenAI({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: buildSystemPrompt(playerProfile) },
      { role: 'user', content: TRAINING_PLAN_PROMPT },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  const plan = validateTrainingPlan(JSON.parse(extractJSON(content)));
  return { ...plan, generatedAt: new Date() };
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function sendMessageGemini(
  config: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: buildSystemPrompt(playerProfile),
  });
  const context = history.slice(-MAX_CONTEXT_MESSAGES);
  const chat = model.startChat({
    history: context.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  });
  const result = await chat.sendMessage(newUserMessage);
  return result.response.text();
}

async function generateTrainingPlanGemini(
  config: AIProviderConfig,
  playerProfile: PlayerProfile,
): Promise<TrainingPlan> {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: buildSystemPrompt(playerProfile),
  });
  const result = await model.generateContent(TRAINING_PLAN_PROMPT);
  const text = result.response.text();
  const plan = validateTrainingPlan(JSON.parse(extractJSON(text)));
  return { ...plan, generatedAt: new Date() };
}

// ─── Hugging Face ─────────────────────────────────────────────────────────────

async function sendMessageHuggingFace(
  config: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
): Promise<string> {
  const hf = new HfInference(config.apiKey);
  const context = history.slice(-MAX_CONTEXT_MESSAGES);
  const response = await hf.chatCompletion({
    model: config.model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: buildSystemPrompt(playerProfile) },
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
): Promise<TrainingPlan> {
  const hf = new HfInference(config.apiKey);
  const response = await hf.chatCompletion({
    model: config.model,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: buildSystemPrompt(playerProfile) },
      { role: 'user', content: TRAINING_PLAN_PROMPT },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from Hugging Face');
  const plan = validateTrainingPlan(JSON.parse(extractJSON(content)));
  return { ...plan, generatedAt: new Date() };
}

// ─── Unified Public API ───────────────────────────────────────────────────────

export async function sendMessage(
  providerConfig: AIProviderConfig,
  history: Message[],
  newUserMessage: string,
  playerProfile: PlayerProfile | null,
): Promise<string> {
  switch (providerConfig.provider) {
    case 'anthropic':
      return sendMessageAnthropic(providerConfig, history, newUserMessage, playerProfile);
    case 'openai':
      return sendMessageOpenAI(providerConfig, history, newUserMessage, playerProfile);
    case 'gemini':
      return sendMessageGemini(providerConfig, history, newUserMessage, playerProfile);
    case 'huggingface':
      return sendMessageHuggingFace(providerConfig, history, newUserMessage, playerProfile);
  }
}

export async function generateTrainingPlan(
  providerConfig: AIProviderConfig,
  playerProfile: PlayerProfile,
): Promise<TrainingPlan> {
  switch (providerConfig.provider) {
    case 'anthropic':
      return generateTrainingPlanAnthropic(providerConfig, playerProfile);
    case 'openai':
      return generateTrainingPlanOpenAI(providerConfig, playerProfile);
    case 'gemini':
      return generateTrainingPlanGemini(providerConfig, playerProfile);
    case 'huggingface':
      return generateTrainingPlanHuggingFace(providerConfig, playerProfile);
  }
}
