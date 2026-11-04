// End-to-end check of the profile set-up and edit flows in a real browser.
// Usage: NODE_ENV=production npm run build && node e2e/profile-setup.mjs
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

const PROVIDER = { provider: 'anthropic', model: 'claude-opus-4-8', apiKey: 'sk-ant-e2e' };

async function openContext(browser, vp, profile) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await context.addInitScript(
    ([provider, saved]) => {
      if (localStorage.getItem('seeded')) return;
      localStorage.setItem('seeded', '1');
      localStorage.setItem('luchoai_provider_config', JSON.stringify(provider));
      if (saved) localStorage.setItem('luchoai_player_profile', JSON.stringify(saved));
    },
    [PROVIDER, profile],
  );
  const page = await context.newPage();
  // Never call a real AI provider from a test.
  await page.route(/api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.openai\.com/, (route) =>
    route.abort(),
  );
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { context, page, errors };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const vp of [
  { name: 'phone-375', width: 375, height: 667 },
  { name: 'small-320', width: 320, height: 568 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  console.log(`\n== ${vp.name} ==`);
  const shot = (page, name) => page.screenshot({ path: `${SHOTS}/profile-${vp.name}-${name}.png`, fullPage: true });
  const noHScroll = async (page) => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) throw new Error(`horizontal scroll of ${over}px`);
  };
  const tap = (page, text) => page.locator('label', { hasText: text }).first().click();
  const next = (page) => page.getByRole('button', { name: /^(Next|Finish)$/ }).click();
  const heading = (page, name) => page.getByRole('heading', { level: 1, name }).waitFor();

  // A parent sets up a profile for a 9-year-old who has no idea where they play.
  {
    const { context, page, errors } = await openContext(browser, vp, null);
    await page.goto(`${base}/profile`);
    await step('parent: first screen asks who is setting up', async () => {
      await heading(page, 'Who is setting up this profile?');
      await page.getByText('Step 1 of 5').waitFor();
      await shot(page, '1-who');
      await noHScroll(page);
    });
    await step('parent: Next without an answer explains what to do', async () => {
      await next(page);
      await page.getByRole('alert').filter({ hasText: 'Pick one to carry on.' }).waitFor();
      await shot(page, '1b-who-error');
    });
    await step('parent: name and age, with what the age changes', async () => {
      await tap(page, "I'm a parent or carer");
      await next(page);
      await heading(page, 'Tell us about your child');
      await page.getByRole('textbox', { name: /first name/ }).fill('Mia');
      await tap(page, /^9$/);
      await page.getByText(/At 9: 30 to 45 minutes/).waitFor();
      await shot(page, '2-about');
      await noHScroll(page);
    });
    await step('parent: position starts on "try everything" in plain words', async () => {
      await next(page);
      await heading(page, 'Where does Mia like to play?');
      if (!(await page.getByRole('radio', { name: /Not sure yet: let Mia try everything/ }).isChecked())) {
        throw new Error('try everything is not picked');
      }
      await page.getByText('(midfield)').waitFor();
      await shot(page, '3-position-parent');
      await noHScroll(page);
    });
    await step('parent: level in plain words', async () => {
      await next(page);
      await heading(page, 'How much football does Mia play?');
      await shot(page, '4-level-parent');
      await noHScroll(page);
    });
    await step('parent: goals as picture tiles, limited to three', async () => {
      await next(page);
      await heading(page, 'What would Mia like to get better at?');
      for (const goal of ['Scoring goals', 'Dribbling past people', 'Cool tricks']) await tap(page, goal);
      await page.getByText('3 of 3 picked').waitFor();
      if (!(await page.getByRole('checkbox', { name: /Making saves/ }).isDisabled())) {
        throw new Error('a fourth goal could be picked');
      }
      await tap(page, 'Using the weaker foot');
      await shot(page, '5-goals-young');
      await noHScroll(page);
    });
    await step('parent: hand-off screen sums it up and says what happens next', async () => {
      await next(page);
      await heading(page, "Mia's profile is ready");
      await page.getByText('Trying every position').waitFor();
      await page.getByText(/never sent anywhere/).waitFor();
      await shot(page, '6-handoff');
      await noHScroll(page);
    });
    await step('parent: hand over shows the player where to start', async () => {
      await page.getByRole('button', { name: 'Hand over to Mia' }).click();
      await heading(page, "You're all set, Mia!");
      await shot(page, '7-player-done');
      await noHScroll(page);
    });
    await step('parent: saved profile survives a reload and opens for editing', async () => {
      await page.reload();
      await heading(page, "Mia's profile");
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('luchoai_player_profile')));
      const want = { position: 'all-round', exploring: true, setupBy: 'parent', age: 9 };
      for (const [k, v] of Object.entries(want)) {
        if (saved[k] !== v) throw new Error(`${k} is ${saved[k]}, wanted ${v}`);
      }
      if (saved.goals.join() !== 'Scoring goals,Dribbling past people,Cool tricks') throw new Error(`goals ${saved.goals}`);
      if (!(await page.getByRole('checkbox', { name: 'Scoring goals' }).isChecked())) throw new Error('goal chip not shown as picked');
      await shot(page, '8-edit');
      await noHScroll(page);
    });
    await step('parent: edit to midfield but still finding out, save and reload', async () => {
      await tap(page, 'In the middle');
      await page.getByRole('radio', { name: 'Still finding out' }).waitFor();
      await page.getByRole('button', { name: 'Save profile' }).click();
      await page.getByRole('status').filter({ hasText: 'Profile saved!' }).waitFor();
      await page.reload();
      await heading(page, "Mia's profile");
      if (!(await page.getByRole('radio', { name: /In the middle/ }).isChecked())) throw new Error('position not kept');
      if (!(await page.getByRole('radio', { name: 'Still finding out' }).isChecked())) throw new Error('exploring not kept');
    });
    await step('parent: no page errors', async () => {
      if (errors.length) throw new Error(errors.join(' | '));
    });
    await context.close();
  }

  // A 12-year-old who chose midfielder but isn't sure yet (the client's feedback).
  {
    const { context, page, errors } = await openContext(browser, vp, null);
    await page.goto(`${base}/profile`);
    await step('player 12: midfielder plus "not sure yet"', async () => {
      await tap(page, "I'm the player");
      await next(page);
      await heading(page, 'About you');
      await page.getByRole('textbox', { name: /first name/ }).fill('Sam');
      await tap(page, /^12$/);
      await next(page);
      await heading(page, 'Where do you play most, Sam?');
      await next(page);
      await page.getByRole('alert').filter({ hasText: "I don't have one yet" }).waitFor();
      await tap(page, 'Midfielder');
      if (!(await page.getByRole('radio', { name: 'Not sure yet' }).isChecked())) throw new Error('not sure yet is not the default');
      await page.getByText(/one each week is in a different spot/).waitFor();
      await shot(page, '9-position-12');
      await noHScroll(page);
    });
    await step('player 12: goals matched to midfield', async () => {
      await next(page);
      await next(page);
      await heading(page, 'What do you want to work on?');
      await page.getByText('For midfielders').waitFor();
      await tap(page, 'Receiving and turning');
      await page.getByRole('button', { name: 'Something else' }).first().click();
      await page.getByRole('textbox', { name: 'Your own goal 1' }).fill('Get into the school team');
      await shot(page, '10-goals-12');
      await noHScroll(page);
      await next(page);
      await heading(page, "You're all set, Sam!");
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('luchoai_player_profile')));
      if (saved.position !== 'midfielder' || saved.exploring !== true) throw new Error(JSON.stringify(saved));
      if (saved.goals.join() !== 'Receiving and turning,Get into the school team') throw new Error(`goals ${saved.goals}`);
    });
    await step('player 12: no page errors', async () => {
      if (errors.length) throw new Error(errors.join(' | '));
    });
    await context.close();
  }

  // A 15-year-old who knows their position.
  {
    const { context, page, errors } = await openContext(browser, vp, null);
    await page.goto(`${base}/profile`);
    await step('player 15: football terms, settled by default', async () => {
      await tap(page, "I'm the player");
      await next(page);
      await page.getByRole('textbox', { name: /first name/ }).fill('Jo');
      await tap(page, /^15$/);
      await next(page);
      await heading(page, 'Your position');
      await tap(page, 'Centre-back or full-back');
      if (!(await page.getByRole('radio', { name: 'Settled' }).isChecked())) throw new Error('settled is not the default');
      await shot(page, '11-position-15');
      await noHScroll(page);
    });
    await step('player 15: goals as pills, for defenders', async () => {
      await next(page);
      await next(page);
      await page.getByText('For defenders').waitFor();
      await tap(page, '1v1 defending');
      await shot(page, '12-goals-15');
      await noHScroll(page);
    });
    await step('player 15: no page errors', async () => {
      if (errors.length) throw new Error(errors.join(' | '));
    });
    await context.close();
  }

  // A profile saved by an older version of the app still opens and keeps working.
  {
    const old = { name: 'Lucho', age: 12, position: 'midfielder', skillLevel: 'beginner', goals: ['Better first touch'], weaknesses: [] };
    const { context, page, errors } = await openContext(browser, vp, old);
    await page.goto(`${base}/profile`);
    await step('old profile: opens in edit mode as a settled midfielder', async () => {
      await heading(page, 'Player profile');
      if (!(await page.getByRole('radio', { name: /^Midfielder/ }).isChecked())) throw new Error('position lost');
      if (!(await page.getByRole('radio', { name: "It's my position" }).isChecked())) throw new Error('should read as settled');
      await page.getByRole('textbox', { name: 'Your own goal 1' }).waitFor();
      await noHScroll(page);
    });
    await step('old profile: no page errors', async () => {
      if (errors.length) throw new Error(errors.join(' | '));
    });
    await context.close();
  }

  // An explorer week on the training page, then telling the coach which spot was the most fun.
  {
    const mia = { name: 'Mia', age: 9, position: 'all-round', exploring: true, setupBy: 'parent', skillLevel: 'beginner', goals: ['Scoring goals'], weaknesses: [] };
    const { context, page, errors } = await openContext(browser, vp, mia);
    const spots = ['At the front: Goal Hunter games', 'In the middle: Pass and Move', 'At the back: Brick Wall', 'In goal: Safe Hands'];
    const plan = {
      weeklyGoal: 'Try a new spot on the pitch every session',
      sessions: spots.map((focus, i) => ({
        id: `session-${i + 1}`, title: `Session ${i + 1}`, duration: 35, focus, notes: 'Rest a day after.',
        drills: [{ name: 'Warm-up game', duration: 10, description: 'Dribble around cones.', coachingPoints: ['Small touches'] }],
      })),
    };
    await page.route('https://api.anthropic.com/**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-4-8',
          content: [{ type: 'text', text: JSON.stringify(plan) }],
          stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
        }),
      }),
    );
    await page.goto(`${base}/training`);
    await step('explorer: plan is marked as an explorer week', async () => {
      await page.getByRole('button', { name: 'Generate Plan' }).click();
      await page.getByText('Explorer week').waitFor();
      await page.getByRole('heading', { name: 'Which spot was the most fun?' }).waitFor();
      await shot(page, '13-explorer-week');
      await noHScroll(page);
    });
    await step('explorer: picking a favourite leans the profile on it', async () => {
      await tap(page, 'In the middle');
      await page.getByRole('status').filter({ hasText: 'leans on midfield play' }).waitFor();
      await shot(page, '14-explorer-answered');
      await page.goto(`${base}/profile`);
      await heading(page, "Mia's profile");
      if (!(await page.getByRole('radio', { name: /In the middle/ }).isChecked())) throw new Error('favourite not saved');
      if (!(await page.getByRole('radio', { name: 'Still finding out' }).isChecked())) throw new Error('should still be exploring');
    });
    await step('explorer: no page errors', async () => {
      if (errors.length) throw new Error(errors.join(' | '));
    });
    await context.close();
  }
}

await browser.close();
server.close();
if (failures.length) {
  console.log(`\n${failures.length} step(s) failed`);
  process.exit(1);
}
console.log('\nAll steps passed');
