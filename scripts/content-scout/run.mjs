// The weekly content scout (docs/content-scout.md). Usage:
//   GEMINI_RESEARCH_API_KEY=... node scripts/content-scout/run.mjs --dry-run
//
// Node runs the TypeScript itself (type stripping, Node 22.18 or newer), so the workflow installs
// no packages. This hook resolves the app's '@/' alias and extensionless imports the way Next.js
// does, so the scout reads the real game library, age groups and safety rules, not copies.
import { existsSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');

if (!process.features.typescript || typeof registerHooks !== 'function') {
  console.error('The content scout needs Node 22.18 or newer: it runs TypeScript directly.');
  process.exit(1);
}

function findTs(file) {
  return [file, `${file}.ts`, path.join(file, 'index.ts')].find(
    (c) => c.endsWith('.ts') && existsSync(c) && statSync(c).isFile(),
  );
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL?.startsWith('file:') ? fileURLToPath(context.parentURL) : '';
    const ours = parent.startsWith(ROOT) && !parent.includes(`${path.sep}node_modules${path.sep}`);
    let file;
    if (specifier.startsWith('@/')) file = findTs(path.join(SRC, specifier.slice(2)));
    else if (ours && /^\.{1,2}\//.test(specifier)) {
      file = findTs(path.resolve(path.dirname(parent), specifier));
    }
    if (!file) return nextResolve(specifier, context);
    return { url: pathToFileURL(file).href, format: 'module-typescript', shortCircuit: true };
  },
});

const { main } = await import('./main.ts');
process.exitCode = await main(process.argv.slice(2), process.env, {
  fetch: globalThis.fetch,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
  log: (line) => console.log(line),
  root: ROOT,
});
