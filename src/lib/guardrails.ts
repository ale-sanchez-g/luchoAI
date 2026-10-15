// Checks that run in the browser around every coach chat call. Anyone can reword their way past
// a pattern, so the scope rules in the system prompt (prompts.ts) do the real work. These make
// the clear-cut cases instant, free and the same on every AI provider, however weak the model.

/** Longest message the chat box takes: plenty for a football question, short for a jailbreak. */
export const MAX_MESSAGE_LENGTH = 500;

export const OFF_TOPIC_REPLY =
  "I'm your football coach, so I can only help with football and getting better as a player. " +
  "I can't help with that one, but you could ask me how to improve your first touch, " +
  'what to practise for your position, or how to stay calm before a big match.';

// Keeps long patterns readable: each piece is a whole regex, joined in order.
function joined(...parts: RegExp[]): RegExp {
  return new RegExp(parts.map((part) => part.source).join(''), 'i');
}

// Requests the coach never answers, worded tightly so football questions can't trip them:
// "make me a training program" passes, "write me a python program" doesn't. Anything these
// miss still reaches the model, which declines it. Stories are left to the model because the
// Story Dribble game needs one.
const BLOCKED_REQUESTS: RegExp[] = [
  /```/,
  /\b(python|javascript|typescript|html|css|sql|php|java|kotlin|golang|c\+\+|c#)(?![\w+#])/i,
  joined(
    /\b(write|create|generate|give me|show me|send me)\s+(me\s+)?(some\s+|the\s+|an?\s+)?/,
    /code\b(?!\s*(word|name|of)\b)/,
  ),
  /\bcode\s+(me\s+|us\s+)?an?\s+(\w+\s+)?(app|game|website|program|bot|script|timer)\b/i,
  joined(
    /\b(make|build|create|design)\s+(me\s+|us\s+)?(an?|my|our)\s+/,
    /(\w+\s+)?(app|website|webpage|bot|chatbot)\b/,
  ),
  joined(
    /\b(write|compose|make up|make|create|generate|invent)\s+(me\s+|us\s+)?(an?|some|another)\s+/,
    /(\w+\s+){0,2}(poem|poetry|haiku|limerick|sonnet|song|rap|chant|essay)s?\b/,
  ),
  /\b(write|compose)\s+(me\s+|us\s+)?(poems|poetry|songs|lyrics|raps|essays)\b/i,
  joined(
    /\b(ignore|disregard|forget|override|bypass)\s+(all\s+)?(of\s+)?(your\s+|the\s+|my\s+)?/,
    /(previous|prior|above|earlier|preceding|original|initial|system)\s+/,
    /(instructions|prompts?|rules|messages|guidelines)\b/,
  ),
  joined(
    /\b(ignore|disregard|forget|override|bypass)\s+(all\s+)?(of\s+)?your\s+/,
    /(instructions|rules|guidelines|programming|restrictions|prompt)\b/,
  ),
  /\b(system|developer)\s+(prompt|message|instructions)\b/i,
  /\b(jailbreak|jailbroken|developer mode|do anything now|dan mode)\b/i,
  /<\/?\s*system\s*>|\[\s*system\s*\]/i,
];

// A player who says they feel sad, scared or unsafe must get the coach's caring reply, never a
// canned redirect, so these messages always go to the model and its wellbeing rules.
const FEELING_WORDS = [
  'sad', 'unhappy', 'upset', 'scared', 'afraid', 'frightened', 'worried', 'anxious', 'nervous',
  'stressed', 'lonely', 'bully', 'bullied', 'bullies', 'bullying', 'hurt', 'hurting', 'unsafe',
  'cry', 'crying', 'depressed', 'hate myself',
];
const SHARES_FEELINGS = new RegExp(`\\b(${FEELING_WORDS.join('|')})\\b`, 'i');

const CODE_LANGUAGES = new Set([
  'python', 'py', 'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx', 'html', 'css', 'scss',
  'sql', 'php', 'java', 'kotlin', 'kt', 'c', 'cpp', 'c++', 'cs', 'csharp', 'c#', 'go', 'golang',
  'rust', 'rs', 'ruby', 'rb', 'swift', 'dart', 'r', 'scala', 'perl', 'lua', 'luau', 'bash', 'sh',
  'shell', 'zsh', 'powershell', 'ps1', 'bat', 'json', 'yaml', 'yml', 'xml', 'vb', 'vba', 'matlab',
]);

// Code syntax that doesn't turn up in a drill diagram drawn with X's, O's, dots and arrows.
// Case-sensitive on purpose: "Select a player from..." is coaching, "SELECT * FROM" is SQL.
const CODE_SYNTAX = new RegExp(
  [
    '\\bdef\\s+\\w+\\s*\\(',
    '\\b(function|func|fn)\\s+\\w+\\s*\\(',
    '\\)\\s*=>',
    '^\\s*import\\s+[\\w.{*]',
    '^\\s*from\\s+[\\w.]+\\s+import\\b',
    '#include\\s*<',
    '<\\?php',
    '<\\/?(div|span|html|body|head|script|style|button|input|form|h1|p)\\b',
    '\\b(console|document|window|System\\.out)\\.\\w+',
    '\\bprint(f|ln)?\\s*\\(',
    '\\blocal\\s+\\w+\\s*=',
    '\\bpublic\\s+(static\\s+)?(void|class|int|String)\\b',
    '\\)\\s*;\\s*$',
    '(\\)|=)\\s*\\{\\s*$',
    '\\bSELECT\\b[\\s\\S]*\\bFROM\\b',
  ].join('|'),
  'm',
);

function containsCode(reply: string): boolean {
  // Every other piece of a split on ``` sits inside a fence (an unclosed one included). Only the
  // text on the fence's own line names a language: a diagram's first line may be a cone "C".
  return reply
    .split('```')
    .filter((_, i) => i % 2 === 1)
    .some((block) => {
      const language = block.split('\n')[0].trim().split(/\s/)[0].toLowerCase();
      return CODE_LANGUAGES.has(language) || CODE_SYNTAX.test(block);
    });
}

/**
 * Screens a player's chat message before it is sent to the AI provider. Returns the coach's
 * reply when the message is a clear-cut off-topic or rule-breaking request, so no call is made
 * and no free question is spent, or null when the message can go to the model.
 */
export function screenPlayerMessage(message: string): string | null {
  if (SHARES_FEELINGS.test(message)) return null;
  return BLOCKED_REQUESTS.some((pattern) => pattern.test(message)) ? OFF_TOPIC_REPLY : null;
}

/**
 * Screens the model's reply before the player sees it. A reply that contains code means the
 * model was talked out of its coaching role, so the whole reply is swapped for the redirect.
 */
export function screenCoachReply(reply: string): string {
  return containsCode(reply) ? OFF_TOPIC_REPLY : reply;
}
