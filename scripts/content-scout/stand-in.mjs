// Dev only: test the content scout without a Gemini key, with you (or Claude, or any model)
// answering its prompts. The real checks and issue writer then run on those answers.
//
//   STANDIN_DIR=/tmp/scout node --import ./scripts/content-scout/stand-in.mjs \
//     scripts/content-scout/run.mjs --dry-run
//
// Each run saves the prompts the scout sends to $STANDIN_DIR/prompts/{research,suggest}.json.
// Answer them in $STANDIN_DIR/responses/: research.json is a whole generateContent response
// with groundingMetadata (see the fixture in src/__tests__/content-scout.test.ts), and
// suggestions.json is the JSON object the schema asks for. Until research.json exists the run
// stops after saving the research prompt. Every other request is refused, so run it without
// GITHUB_TOKEN.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.STANDIN_DIR;
if (!dir) throw new Error('Set STANDIN_DIR to a folder for the prompts and answers.');
fs.mkdirSync(path.join(dir, 'prompts'), { recursive: true });

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function answer(name) {
  const file = path.join(dir, 'responses', name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

globalThis.fetch = async (url, init = {}) => {
  const host = new URL(url).host;
  if (host !== 'generativelanguage.googleapis.com') {
    return reply(404, { message: `stand-in: no network for ${host}` });
  }
  const body = JSON.parse(init.body);
  const step = body.tools ? 'research' : 'suggest';
  const prompt = {
    system: body.systemInstruction.parts[0].text,
    user: body.contents[0].parts[0].text,
    generationConfig: body.generationConfig,
  };
  fs.writeFileSync(path.join(dir, 'prompts', `${step}.json`), JSON.stringify(prompt, null, 2));
  if (step === 'research') {
    const research = answer('research.json');
    if (research) return reply(200, research);
    const message = `stand-in: answer prompts/research.json in ${dir}/responses/research.json`;
    return reply(400, { error: { message } });
  }
  const text = JSON.stringify(answer('suggestions.json') ?? { suggestions: [] });
  return reply(200, { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });
};
