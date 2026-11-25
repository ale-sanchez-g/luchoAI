// End-to-end check of the privacy page and the promises it makes, in a real browser.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/privacy-page.mjs
// Walks the page empty and full at three sizes, deletes everything with the mouse and with the
// keyboard, reloads, follows the links that lead to it, and fails if any page load contacts
// another site or sets a cookie ("no ads, no tracking"). Works with or without the free-trial
// key baked in. Screenshots land in e2e/screenshots (gitignored). Exits non-zero on any failure.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.resolve('out');
const SHOTS = path.resolve('e2e/screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.md': 'text/markdown',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = [url, `${url}.html`, path.join(url, 'index.html')]
    .map((c) => path.join(OUT, c))
    .find((f) => f.startsWith(OUT) && fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/html' });
    fs.createReadStream(path.join(OUT, '404.html')).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

// The page only describes the free trial when the build has the free key.
const FREE_TRIAL = fs
  .readFileSync(path.join(OUT, 'privacy/index.html'), 'utf8')
  .includes('Try it free');
console.log(FREE_TRIAL ? 'This build has the free trial' : 'This build has no free trial');

const VIEWPORTS = [
  { name: 'small-320', width: 320, height: 568 },
  { name: 'phone-375', width: 375, height: 667 },
  { name: 'desktop', width: 1280, height: 800 },
];

const ROUTES = ['/', '/coach/', '/training/', '/games/', '/wellbeing/', '/profile/', '/privacy/'];

const PLAYER_KEYS = [
  'luchoai_api_key',
  'luchoai_provider_config',
  'luchoai_player_profile',
  'luchoai_wellbeing_checkins',
  'luchoai_saved_plans',
  'luchoai_game_scores',
];

function plan(goal) {
  return {
    id: `plan-${goal.length}`,
    savedAt: '2026-11-18T10:00:00.000Z',
    plan: {
      weeklyGoal: goal,
      generatedAt: '2026-11-18T10:00:00.000Z',
      sessions: [
        {
          id: 'session-1',
          title: 'Session 1',
          duration: 30,
          focus: 'First touch',
          notes: 'Have fun.',
          drills: [
            {
              name: 'Wall passes',
              duration: 10,
              description: 'Pass against a wall.',
              coachingPoints: ['Soft touch'],
            },
          ],
        },
      ],
    },
  };
}

function checkIn(date) {
  return {
    date,
    mood: 4,
    balance: { sleep: 3, football: 3, school: 2, people: 3, fun: 3 },
    proudOf: 'Kept going after a mistake',
  };
}

const RETURNING_PLAYER = {
  luchoai_provider_config: JSON.stringify({
    provider: 'anthropic',
    model: 'claude-opus-5-5',
    apiKey: 'sk-ant-e2e',
  }),
  luchoai_api_key: 'sk-ant-e2e',
  luchoai_player_profile: JSON.stringify({
    name: 'Mia',
    age: 11,
    position: 'midfielder',
    skillLevel: 'beginner',
    goals: ['First touch'],
    weaknesses: [],
  }),
  luchoai_saved_plans: JSON.stringify([
    plan('Sharper first touch'),
    plan('Passing with both feet'),
  ]),
  luchoai_wellbeing_checkins: JSON.stringify(
    ['2026-11-16', '2026-11-17', '2026-11-18'].map(checkIn),
  ),
  luchoai_game_scores: JSON.stringify({ space: 3, press: 2 }),
  luchoai_free_questions_used: '2',
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

// A context that records (and blocks) every request to another site, and every page error.
async function newContext(viewport, storage) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const outside = [];
  await context.route(
    (url) => url.origin !== base,
    (route) => {
      outside.push(route.request().url());
      return route.abort();
    },
  );
  if (storage) {
    // Seed once: a reload after deleting must show what is really left, not a fresh copy.
    await context.addInitScript((items) => {
      try {
        if (sessionStorage.getItem('seeded')) return;
        sessionStorage.setItem('seeded', '1');
        for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
      } catch {
        // about:blank has no storage; the app's own pages do.
      }
    }, storage);
  }
  const errors = [];
  context.on('page', (page) => {
    page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console error: ${msg.text()}`);
    });
  });
  return { context, outside, errors };
}

async function noSideScroll(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert(overflow <= 0, `horizontal scroll of ${overflow}px`);
}

async function savedLines(page) {
  return page.locator('#delete li').allInnerTexts();
}

async function storedKeys(page) {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith('luchoai_'))
      .sort(),
  );
}

async function minTargetSize(locator) {
  const box = await locator.boundingBox();
  assert(box, 'target is not on screen');
  return Math.min(box.width, box.height);
}

for (const vp of VIEWPORTS) {
  console.log(`\n== ${vp.name} ==`);

  await step(`${vp.name}: a first visit reads cleanly and has nothing to delete`, async () => {
    const { context, outside, errors } = await newContext(vp);
    const page = await context.newPage();
    await page.goto(`${base}/privacy/`, { waitUntil: 'networkidle' });
    assert((await page.title()) === 'Privacy — LuchoAI', `title "${await page.title()}"`);
    await page.getByRole('heading', { level: 1, name: 'Privacy' }).waitFor();
    await page.getByText('Nothing about you is saved on this device right now.').waitFor();
    assert(
      (await page.locator('#delete button').count()) === 0,
      'a delete button with nothing to delete',
    );
    const freeText = await page.getByText(/Try it free/).count();
    assert(
      FREE_TRIAL ? freeText > 0 : freeText === 0,
      `free-trial wording shown ${freeText} times`,
    );
    await noSideScroll(page);
    for (const link of await page.locator('a[href^="http"]').all()) {
      const href = await link.getAttribute('href');
      assert(href.startsWith('https://'), `${href} is not https`);
      assert((await link.getAttribute('target')) === '_blank', `${href} opens in the same tab`);
      assert((await link.getAttribute('rel')) === 'noopener noreferrer', `${href} rel`);
    }
    await page.screenshot({
      path: path.join(SHOTS, `privacy-empty-${vp.name}.png`),
      fullPage: true,
    });
    assert(outside.length === 0, `contacted ${outside.join(', ')}`);
    assert(errors.length === 0, errors.join('; '));
    await context.close();
  });

  await step(
    `${vp.name}: lists what is saved, then deletes it all after a confirmation`,
    async () => {
      const { context, outside, errors } = await newContext(vp, RETURNING_PLAYER);
      const page = await context.newPage();
      await page.goto(`${base}/privacy/`, { waitUntil: 'networkidle' });
      await page.locator('#delete li').first().waitFor();
      const lines = await savedLines(page);
      const expected = [
        'A player profile',
        'An AI key for Anthropic (Claude)',
        '2 saved training plans',
        '3 wellbeing check-ins',
        'Game IQ best scores',
      ];
      assert(
        JSON.stringify(lines) === JSON.stringify(expected),
        `saved lines ${JSON.stringify(lines)}`,
      );
      await page.locator('#delete').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(SHOTS, `privacy-full-${vp.name}.png`),
        fullPage: true,
      });

      const deleteButton = page.getByRole('button', { name: 'Delete my LuchoAI data' });
      assert((await minTargetSize(deleteButton)) >= 24, 'delete button smaller than 24px');
      await deleteButton.click();
      const cancel = page.getByRole('button', { name: 'Cancel' });
      const yes = page.getByRole('button', { name: 'Yes, delete everything' });
      await yes.waitFor();
      assert(await cancel.evaluate((el) => el === document.activeElement), 'Cancel is not focused');
      assert(
        (await minTargetSize(yes)) >= 24 && (await minTargetSize(cancel)) >= 24,
        'small buttons',
      );
      await page
        .locator('#delete')
        .screenshot({ path: path.join(SHOTS, `privacy-confirm-${vp.name}.png`) });

      await cancel.click();
      assert(
        await deleteButton.evaluate((el) => el === document.activeElement),
        'focus not returned',
      );
      assert((await storedKeys(page)).length === 7, 'Cancel changed what is saved');

      await deleteButton.click();
      await yes.click();
      const done = page.getByRole('status').filter({ hasText: 'has been deleted' });
      await done.waitFor();
      assert(
        await done.evaluate((el) => el === document.activeElement),
        'the result is not focused',
      );
      const left = await storedKeys(page);
      assert(
        JSON.stringify(left) === '["luchoai_free_questions_used"]',
        `left behind ${left.join(', ')}`,
      );
      await page
        .locator('#delete')
        .screenshot({ path: path.join(SHOTS, `privacy-deleted-${vp.name}.png`) });
      await noSideScroll(page);

      await page.reload({ waitUntil: 'networkidle' });
      await page.getByText('Nothing about you is saved on this device right now.').waitFor();

      // Everything else in the app sees the deletion too.
      await page.goto(`${base}/coach/`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Welcome to LuchoAI' }).waitFor();
      await page.goto(`${base}/wellbeing/`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Daily check-in' }).waitFor();
      assert((await page.getByText('Your recent check-ins').count()) === 0, 'check-ins survived');

      assert(outside.length === 0, `contacted ${outside.join(', ')}`);
      assert(errors.length === 0, errors.join('; '));
      await context.close();
    },
  );
}

await step('the delete works with the keyboard alone', async () => {
  const { context, errors } = await newContext(VIEWPORTS[2], RETURNING_PLAYER);
  const page = await context.newPage();
  await page.goto(`${base}/privacy/`, { waitUntil: 'networkidle' });
  const deleteButton = page.getByRole('button', { name: 'Delete my LuchoAI data' });
  await deleteButton.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Cancel' }).waitFor();
  await page.keyboard.press('Shift+Tab');
  const focused = await page.evaluate(() => document.activeElement?.textContent);
  assert(focused === 'Yes, delete everything', `Shift+Tab reached "${focused}"`);
  await page.keyboard.press('Enter');
  await page.getByRole('status').filter({ hasText: 'has been deleted' }).waitFor();
  const left = await storedKeys(page);
  assert(
    left.every((key) => !PLAYER_KEYS.includes(key)),
    `left behind ${left.join(', ')}`,
  );
  assert(errors.length === 0, errors.join('; '));
  await context.close();
});

await step('the home page and the AI key screen lead to the privacy page', async () => {
  const { context, errors } = await newContext(VIEWPORTS[1]);
  const page = await context.newPage();
  const fromHome = [
    [
      'grown-ups section',
      page
        .getByRole('region', { name: 'For parents, carers and coaches' })
        .getByRole('link', { name: /Read the privacy page/ }),
    ],
    ['footer', page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' })],
  ];
  for (const [where, link] of fromHome) {
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await link.click();
    await page.waitForURL(`${base}/privacy/`);
    await page
      .getByRole('heading', { level: 1, name: 'Privacy' })
      .waitFor({ timeout: 5000 })
      .catch(() => {
        throw new Error(`the ${where} link did not open the privacy page`);
      });
  }
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.getByText('Where is my information saved?').click();
  await page
    .getByRole('region', { name: 'Questions' })
    .getByRole('link', { name: /Read the privacy page/ })
    .click();
  await page.waitForURL(`${base}/privacy/`);

  await page.goto(`${base}/coach/`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Welcome to LuchoAI' }).waitFor();
  await page.screenshot({
    path: path.join(SHOTS, 'privacy-key-screen-link-phone-375.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Read the privacy page' }).click();
  await page.waitForURL(`${base}/privacy/`);
  assert(errors.length === 0, errors.join('; '));
  await context.close();
});

for (const visitor of ['first visit', 'returning player']) {
  await step(`no page contacts another site or sets a cookie (${visitor})`, async () => {
    const { context, outside, errors } = await newContext(
      VIEWPORTS[1],
      visitor === 'returning player' ? RETURNING_PLAYER : undefined,
    );
    const page = await context.newPage();
    for (const route of ROUTES) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    }
    assert(outside.length === 0, `contacted ${[...new Set(outside)].join(', ')}`);
    const cookies = await context.cookies();
    assert(cookies.length === 0, `cookies: ${cookies.map((c) => c.name).join(', ')}`);
    assert(errors.length === 0, errors.join('; '));
    await context.close();
  });
}

await browser.close();
server.close();
console.log(
  failures.length ? `\n${failures.length} step(s) failed` : '\nAll privacy checks passed',
);
process.exit(failures.length ? 1 : 0);
