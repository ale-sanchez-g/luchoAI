import type { PlayerProfile } from '@/types';

export interface ContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ContextMeta {
  id: string;
  filename: string;
  sports: string[];
  minAge: number;
  maxAge: number;
}

const CONTEXT_DOCS: ContextMeta[] = [
  {
    id: 'ytkb-000',
    filename: '00-index-and-metadata-schema.md',
    sports: ['football', 'rugby', 'general'],
    minAge: 5,
    maxAge: 18,
  },
  {
    id: 'ytkb-001',
    filename: '01-athlete-development-framework.md',
    sports: ['football', 'rugby', 'general'],
    minAge: 5,
    maxAge: 18,
  },
  {
    id: 'ytkb-002',
    filename: '02-speed-and-agility.md',
    sports: ['football', 'rugby', 'general'],
    minAge: 9,
    maxAge: 18,
  },
  {
    id: 'ytkb-003',
    filename: '03-strength-and-power-youth.md',
    sports: ['football', 'rugby', 'general'],
    minAge: 13,
    maxAge: 18,
  },
  {
    id: 'ytkb-004',
    filename: '04-endurance-and-conditioning.md',
    sports: ['football', 'rugby', 'general'],
    minAge: 5,
    maxAge: 18,
  },
  {
    id: 'ytkb-005',
    filename: '05-football-soccer-specific.md',
    sports: ['football'],
    minAge: 5,
    maxAge: 18,
  },
  {
    id: 'ytkb-007',
    filename: '07-injury-prevention-and-recovery.md',
    sports: ['football', 'rugby', 'general'],
    minAge: 5,
    maxAge: 18,
  },
];

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// Module-level cache so docs are fetched at most once per session
const docCache = new Map<string, string>();

async function fetchDoc(filename: string): Promise<string> {
  if (docCache.has(filename)) return docCache.get(filename)!;
  const res = await fetch(`${BASE_PATH}/context/${filename}`);
  if (!res.ok) throw new Error(`Failed to load context doc: ${filename} (${res.status})`);
  const text = await res.text();
  // Strip YAML frontmatter — the metadata is handled via CONTEXT_DOCS above
  const stripped = text.startsWith('---')
    ? text.slice(text.indexOf('---', 3) + 3).trimStart()
    : text;
  docCache.set(filename, stripped);
  return stripped;
}

function selectDocs(profile: PlayerProfile | null): ContextMeta[] {
  const age = profile?.age ?? 12;
  return CONTEXT_DOCS.filter(
    (doc) => doc.sports.includes('football') && age >= doc.minAge && age <= doc.maxAge,
  );
}

const BATCH_SIZE = 3;

/**
 * Fetch and batch evidence-based coaching context for a player.
 * Returns message pairs (user context load + assistant acknowledgement) to
 * inject before the conversation history in any LLM call.
 * Returns [] on fetch failure so callers degrade gracefully.
 */
export async function loadContextBatches(
  profile: PlayerProfile | null,
): Promise<ContextMessage[]> {
  const meta = selectDocs(profile);

  let docs: Array<{ id: string; content: string }>;
  try {
    docs = await Promise.all(
      meta.map(async (m) => ({ id: m.id, content: await fetchDoc(m.filename) })),
    );
  } catch {
    return [];
  }

  const messages: ContextMessage[] = [];
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const batchContent = batch
      .map((d) => `### ${d.id}\n\n${d.content}`)
      .join('\n\n---\n\n');
    messages.push({
      role: 'user',
      content: `Evidence-based youth football coaching knowledge (batch ${Math.floor(i / BATCH_SIZE) + 1}):\n\n${batchContent}`,
    });
    messages.push({
      role: 'assistant',
      content:
        'I have reviewed this coaching knowledge and will apply these evidence-based principles when advising this player.',
    });
  }

  return messages;
}
