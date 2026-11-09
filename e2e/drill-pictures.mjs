// End-to-end check of the drill pictures on the training plan, in a real browser.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/drill-pictures.mjs
// Screenshots land in e2e/screenshots (gitignored). Exits non-zero on any failed step.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.resolve('out');
const SHOTS = path.resolve('e2e/screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x').pathname;
  const candidates = [url, `${url}.html`, path.join(url, 'index.html')];
  const file = candidates.map((c) => path.join(OUT, c)).find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) {
    res.writeHead(404).end('not found');
    return;
  }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

// Every setup the app draws, plus "none" and a made-up one, which must show no picture.
const SETUPS = [
  'slalom', 'gates', 'square', 'passing-pair', 'wall', 'shooting',
  'one-v-one', 'goalkeeping', 'ball-mastery', 'running', 'cool-down',
];
const drill = (setup, i) => ({
  name: `Drill ${i + 1} (${setup})`,
  duration: 5,
  description: 'Follow the picture and have fun with your helper.',
  coachingPoints: ['Keep the ball close', 'Look up'],
  setup,
});
const PLAN = {
  weeklyGoal: 'Picture week: every drill setup',
  sessions: [
    { id: 's1', title: 'Pictures one', duration: 30, focus: 'Dribbling', notes: 'Rest a day.', drills: SETUPS.slice(0, 6).map(drill) },
    { id: 's2', title: 'Pictures two', duration: 30, focus: 'Mixed', notes: 'Rest a day.', drills: SETUPS.slice(6).map((s, i) => drill(s, i + 6)) },
    { id: 's3', title: 'No pictures', duration: 10, focus: 'Fallbacks', notes: 'Easy day.', drills: [drill('none', 11), drill('rondo', 12), { ...drill('x', 13), setup: undefined }] },
  ],
};

const failures = [];
async function step(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`);
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const vp of [
  { name: 'phone-375', width: 375, height: 667 },
  { name: 'small-320', width: 320, height: 568 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  console.log(`\n== ${vp.name} ==`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await page.route('https://api.anthropic.com/**', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-4-8',
        content: [{ type: 'text', text: JSON.stringify(PLAN) }],
        stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
      }),
    }),
  );
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('luchoai_provider_config', JSON.stringify({ provider: 'anthropic', model: 'claude-opus-4-8', apiKey: 'sk-ant-e2e' }));
    localStorage.setItem('luchoai_player_profile', JSON.stringify({ name: 'Sid', age: 9, position: 'forward', skillLevel: 'beginner', goals: ['Dribbling'], weaknesses: [] }));
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const noHScroll = async () => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) throw new Error(`horizontal scroll of ${over}px`);
  };
  const pictures = () => page.locator('figure svg[role="img"]');

  await page.goto(`${base}/training`);
  await step('no pictures before a plan exists', async () => {
    await page.getByRole('button', { name: 'Generate Plan' }).waitFor();
    if (await pictures().count()) throw new Error('picture shown with no plan');
  });
  await step('every known setup shows one picture, unknown ones show none', async () => {
    await page.getByRole('button', { name: 'Generate Plan' }).click();
    await page.getByText('Picture week: every drill setup').waitFor();
    const count = await pictures().count();
    if (count !== SETUPS.length) throw new Error(`expected ${SETUPS.length} pictures, got ${count}`);
    for (const name of ['Drill 12 (none)', 'Drill 13 (rondo)', 'Drill 14 (x)']) {
      const card = page.getByText(name).locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
      if (await card.locator('figure').count()) throw new Error(`${name} has a picture`);
    }
    await page.screenshot({ path: `${SHOTS}/drills-${vp.name}-plan.png`, fullPage: true });
    await noHScroll();
  });
  await step('pictures fit inside their drill card', async () => {
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('figure')].filter((f) => {
        const card = f.closest('div.rounded-lg').getBoundingClientRect();
        const r = f.getBoundingClientRect();
        return r.left < card.left || r.right > card.right || r.width < 200;
      }).length,
    );
    if (bad) throw new Error(`${bad} picture(s) overflow or are too small`);
  });
  await step('pictures come back with a saved plan after reload', async () => {
    await page.getByRole('button', { name: 'Save this plan' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'View' }).click();
    await page.getByText('Pictures two').waitFor();
    const count = await pictures().count();
    if (count !== SETUPS.length) throw new Error(`expected ${SETUPS.length} pictures, got ${count}`);
  });
  if (vp.name === 'phone-375') {
    await step('close-up of each picture', async () => {
      const figs = page.locator('figure');
      for (let i = 0; i < SETUPS.length; i += 1) {
        await figs.nth(i).screenshot({ path: `${SHOTS}/drills-setup-${SETUPS[i]}.png` });
      }
    });
  }
  await step('no page errors', async () => {
    if (errors.length) throw new Error(errors.join('; '));
  });
  await context.close();
}
await browser.close();
server.close();
if (failures.length) {
  console.log(`\n${failures.length} step(s) failed`);
  process.exit(1);
}
console.log('\nAll e2e steps passed');
