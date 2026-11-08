import fs from 'node:fs';
import path from 'node:path';
import { REASONS } from '../src/governance/decision';

const DOCS = path.resolve(__dirname, '..', '..', 'docs', 'sentinel');

describe('documentation stays in step with the engine', () => {
  it('documents every reason code with its gate and default effect', () => {
    const text = fs.readFileSync(path.join(DOCS, 'decision-reference.md'), 'utf8');
    for (const [code, spec] of Object.entries(REASONS)) {
      const row = text.split('\n').find((line) => line.startsWith(`| \`${code}\` |`));
      expect(row).toBeDefined();
      expect(row).toContain(`| ${spec.effect}`);
      const section = text.slice(0, text.indexOf(row as string)).lastIndexOf(`## ${spec.gate} `);
      expect(section).toBeGreaterThan(-1);
      expect(text.slice(section, text.indexOf(row as string))).not.toMatch(/\n## G\d /);
    }
  });

  it('links every document from the index', () => {
    const index = fs.readFileSync(path.join(DOCS, 'README.md'), 'utf8');
    for (const file of fs.readdirSync(DOCS).filter((f) => f.endsWith('.md') && f !== 'README.md')) {
      expect(index).toContain(`(./${file})`);
    }
  });
});
