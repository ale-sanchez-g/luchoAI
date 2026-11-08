// Smoke test of every route in the built static site, for framework upgrades (e.g. Next.js majors).
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/routes-smoke.mjs
// Visits each page as a first-time visitor and as a returning player at three screen sizes and
// fails on page errors, console errors, missing local assets, horizontal scroll or a blank page.
// Screenshots land in e2e/screenshots (gitignored). Exits non-zero on any failed step.
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
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const candidates = [url, `${url}.html`, path.join(url, 'index.html')];
  const file = candidates
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

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/coach/', name: 'coach' },
  { path: '/training/', name: 'training' },
  { path: '/games/', name: 'games' },
  { path: '/wellbeing/', name: 'wellbeing' },
  { path: '/profile/', name: 'profile' },
  { path: '/no-such-page/', name: 'not-found', expectStatus: 404 },
];

const VIEWPORTS = [
  { name: 'small-320', width: 320, height: 568 },
  { name: 'phone-375', width: 375, height: 667 },
  { name: 'desktop', width: 1280, height: 800 },
];

const RETURNING_PLAYER = {
  luchoai_provider_config: JSON.stringify({
    provider: 'anthropic',
    model: 'claude-opus-4-8',
    apiKey: 'sk-ant-e2e',
  }),
  luchoai_player_profile: JSON.stringify({
    name: 'Lucho',
    age: 12,
    position: 'midfielder',
    skillLevel: 'beginner',
    goals: ['Better first touch'],
    weaknesses: [],
  }),
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

await step('web manifest is served as valid JSON with icons that exist', async () => {
  const res = await fetch(`${base}/manifest.webmanifest`);
  assert(res.status === 200, `status ${res.status}`);
  const manifest = await res.json();
  assert(manifest.short_name === 'LuchoAI', `short_name ${manifest.short_name}`);
  for (const icon of manifest.icons) {
    const iconRes = await fetch(`${base}${icon.src}`);
    assert(iconRes.status === 200, `${icon.src} returned ${iconRes.status}`);
  }
});

for (const visitor of ['first-visit', 'returning']) {
  for (const vp of VIEWPORTS) {
    console.log(`\n== ${visitor} / ${vp.name} ==`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    // Any real AI call from a smoke test is a bug: page loads must never contact a provider.
    await context.route(/^https:\/\/(?!localhost)/, (route) => route.abort());
    if (visitor === 'returning') {
      await context.addInitScript((items) => {
        for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
      }, RETURNING_PLAYER);
    }

    for (const route of ROUTES) {
      const page = await context.newPage();
      const problems = [];
      page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        // The browser logs the 404 document itself as a failed resource; that one is expected.
        if (route.expectStatus === 404 && /404/.test(msg.text())) return;
        problems.push(`console error: ${msg.text()}`);
      });
      page.on('response', (res) => {
        const url = new URL(res.url());
        if (url.origin !== base || res.status() < 400) return;
        if (route.expectStatus === 404 && url.pathname === route.path) return;
        problems.push(`${res.status()} for ${url.pathname}`);
      });
      page.on('requestfailed', (req) => {
        if (new URL(req.url()).origin !== base) return;
        // Next cancels link prefetches it no longer needs; only a lost script, style, image or
        // font would break the page.
        if (req.failure()?.errorText === 'net::ERR_ABORTED' && req.resourceType() === 'fetch') {
          return;
        }
        problems.push(`failed request ${req.url()} (${req.failure()?.errorText})`);
      });

      await step(`${route.name} loads cleanly`, async () => {
        const res = await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' });
        assert(res.status() === (route.expectStatus ?? 200), `status ${res.status()}`);
        const text = await page.locator('body').innerText();
        assert(text.trim().length > 40, 'page is blank');
        const title = await page.title();
        assert(/LuchoAI/.test(title), `title "${title}"`);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        assert(overflow <= 0, `horizontal scroll of ${overflow}px`);
        const styled = await page.evaluate(
          () => getComputedStyle(document.body).fontFamily !== '' &&
            document.styleSheets.length > 0,
        );
        assert(styled, 'no stylesheet applied');
        await page.screenshot({
          path: path.join(SHOTS, `routes-${visitor}-${vp.name}-${route.name}.png`),
          fullPage: true,
        });
        assert(problems.length === 0, problems.join('; '));
      });
      await page.close();
    }
    await context.close();
  }
}

await step('header links navigate client-side without a full reload', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route(/^https:\/\/(?!localhost)/, (route) => route.abort());
  // A returning player sees the shared header on every page; first-run set-up screens hide it.
  await context.addInitScript((items) => {
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
  }, RETURNING_PLAYER);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // The landing page has its own hero instead of the shared header, so start inside the app.
  await page.goto(`${base}/games/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.__sameDocument = true;
  });
  for (const target of ['/wellbeing/', '/profile/', '/training/', '/games/', '/coach/']) {
    await page.locator(`header a[href="${target}"]`).first().click();
    await page.waitForURL(`${base}${target}`);
    await page.waitForLoadState('networkidle');
    const same = await page.evaluate(() => window.__sameDocument === true);
    assert(same, `navigating to ${target} reloaded the whole page`);
  }
  assert(errors.length === 0, errors.join('; '));
  await context.close();
});

await browser.close();
server.close();

if (failures.length) {
  console.log(`\n${failures.length} step(s) failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAll route smoke steps passed');
