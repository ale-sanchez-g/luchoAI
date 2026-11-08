export interface TextHit {
  name: string;
  line: number;
  column: number;
  snippet: string;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Finds references to package names in non-code text files (shell scripts, Dockerfiles, other
 * YAML, HTML). Only quoted module-like strings and `npx <name>` invocations count, which keeps
 * common words such as "next" in prose from matching.
 */
export function textReferences(text: string, names: readonly string[]): TextHit[] {
  const hits: TextHit[] = [];
  const lines = text.split('\n');
  for (const name of names) {
    const n = escape(name);
    const patterns = [
      new RegExp(`(['"\`])${n}(?:/[^'"\`\\s]*)?\\1`, 'g'),
      new RegExp(
        `\\b(?:npx|pnpm\\s+dlx|yarn\\s+dlx|bunx)\\s+(?:-{1,2}\\S+\\s+)*${n}(?=[@\\s]|$)`,
        'g',
      ),
    ];
    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) {
          hits.push({
            name,
            line: index + 1,
            column: match.index + 1,
            snippet: line.trim().slice(0, 160),
          });
          break;
        }
      }
    });
  }
  return hits;
}
