// End-to-end check of the saved training plans flow in a real browser.
// Usage: NODE_ENV=production npm run build && node e2e/saved-plans.mjs
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

let planCount = 0;
function fakePlan() {
  planCount += 1;
  return {
    weeklyGoal: `Plan ${planCount}: sharper first touch`,
    sessions: [1, 2, 3, 4].map((n) => ({
      id: `session-${n}`,
      title: `Session ${n}`,
      duration: 45,
      focus: 'First touch',
      notes: 'Have fun and stay relaxed.',
      drills: [{ name: 'Wall passes', duration: 10, description: 'Pass against a wall.', coachingPoints: ['Head up', 'Soft touch'] }],
    })),
  };
}

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
  planCount = 0;
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await page.route('https://api.anthropic.com/**', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-4-8',
        content: [{ type: 'text', text: JSON.stringify(fakePlan()) }],
        stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
      }),
    }),
  );
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('luchoai_provider_config', JSON.stringify({ provider: 'anthropic', model: 'claude-opus-4-8', apiKey: 'sk-ant-e2e' }));
    localStorage.setItem('luchoai_player_profile', JSON.stringify({ name: 'Lucho', age: 12, position: 'midfielder', skillLevel: 'beginner', goals: ['Better first touch'], weaknesses: [] }));
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const savedCount = () => page.locator('#saved-plans-heading').innerText();
  const noHScroll = async () => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) throw new Error(`horizontal scroll of ${over}px`);
  };
  const generate = async () => {
    await page.getByRole('button', { name: /Generate Plan|Regenerate/ }).click();
    await page.getByRole('button', { name: /Save this plan/ }).waitFor();
  };

  await page.goto(`${base}/training`);
  await step('empty state shows 0/5', async () => {
    await page.getByText('Saved plans (0/5)').waitFor();
    await page.screenshot({ path: `${SHOTS}/${vp.name}-1-empty.png`, fullPage: true });
    await noHScroll();
  });
  await step('generate then save a plan', async () => {
    await generate();
    await page.getByRole('button', { name: 'Save this plan' }).click();
    await page.getByText('Saved plans (1/5)').waitFor();
    await page.getByRole('button', { name: 'Saved', exact: true }).waitFor();
    await page.screenshot({ path: `${SHOTS}/${vp.name}-2-saved-one.png`, fullPage: true });
    await noHScroll();
  });
  await step('saved plan survives a reload and can be viewed', async () => {
    await page.reload();
    await page.getByText('Saved plans (1/5)').waitFor();
    await page.getByRole('button', { name: 'View' }).click();
    await page.getByText('Plan 1: sharper first touch').first().waitFor();
    await page.getByText('Session 4').waitFor();
  });
  await step('fill up to 5 saved plans', async () => {
    for (let i = 2; i <= 5; i += 1) {
      await generate();
      await page.getByRole('button', { name: 'Save this plan' }).click();
      await page.getByText(`Saved plans (${i}/5)`).waitFor();
    }
    await page.screenshot({ path: `${SHOTS}/${vp.name}-3-five-saved.png`, fullPage: true });
    await noHScroll();
  });
  await step('sixth save is refused with a friendly message', async () => {
    await generate();
    await page.getByRole('button', { name: 'Save this plan' }).click();
    await page.getByRole('alert').filter({ hasText: 'You can keep 5 plans' }).waitFor();
    if ((await savedCount()) !== 'Saved plans (5/5)') throw new Error('count changed');
    await page.screenshot({ path: `${SHOTS}/${vp.name}-4-full.png`, fullPage: true });
    await noHScroll();
  });
  await step('removing one makes room and the sixth plan saves', async () => {
    await page.getByRole('button', { name: /^Remove saved plan: Plan 2/ }).click();
    await page.getByText('Saved plans (4/5)').waitFor();
    await page.getByRole('button', { name: 'Save this plan' }).click();
    await page.getByText('Saved plans (5/5)').waitFor();
    await page.screenshot({ path: `${SHOTS}/${vp.name}-5-after-remove.png`, fullPage: true });
  });
  await step('removed plan stays gone after reload', async () => {
    await page.reload();
    await page.getByText('Saved plans (5/5)').waitFor();
    if (await page.getByText('Plan 2: sharper first touch').count()) throw new Error('Plan 2 came back');
  });
  await step('remove everything', async () => {
    for (let i = 5; i >= 1; i -= 1) {
      await page.getByRole('button', { name: /^Remove saved plan/ }).first().click();
      await page.getByText(`Saved plans (${i - 1}/5)`).waitFor();
    }
    await page.getByText(/Save a plan to come back to it later/).waitFor();
  });
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
