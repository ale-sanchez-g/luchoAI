// End-to-end check of the key player's face on the Game IQ pitch, in a real browser.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/game-iq-key-player.mjs
// Walks every situation of every theme at three screen sizes. Screenshots land in e2e/screenshots
// (gitignored), with a close-up of every situation at 375px. Exits non-zero on any failed step.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.resolve('out');
const SHOTS = path.resolve('e2e/screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x').pathname;
  const candidates = [url, `${url}.html`, path.join(url, 'index.html')];
  const file = candidates.map((c) => path.join(OUT, c)).find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const THEMES = 8;
const SITUATIONS = 30;
const MIN_FACE_PX = 28;

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

// Runs in the page. Boxes are in pitch units (the SVG viewBox), except faceHeightPx.
function measure() {
  const svg = document.querySelector('svg[role="img"]');
  const box = (el, pad = 0) => {
    const b = el.getBBox();
    return { l: b.x - pad, t: b.y - pad, r: b.x + b.width + pad, b: b.y + b.height + pad };
  };
  const group = svg.querySelector('[data-key-player]');
  const image = group.querySelector('image');
  const size = Number(image.getAttribute('width'));
  // The art is a square with see-through sides; the head itself is 82% as wide as it is tall.
  const side = size * 0.088;
  const g = box(group);
  const face = { l: g.l + side, r: g.r - side, t: g.t, b: g.b };
  const text = [...svg.querySelectorAll('text')].find((t) => t.textContent === 'YOU');
  const tb = text.getBBox();
  const baseline = Number(text.getAttribute('y'));
  const label = { l: tb.x - 0.4, r: tb.x + tb.width + 0.4, t: baseline - 2.85, b: baseline + 0.4 };
  const round = (el, kind, pad) => ({
    kind,
    cx: el.cx.baseVal.value,
    cy: el.cy.baseVal.value,
    radius: el.r.baseVal.value + pad,
  });
  const others = [
    ...[...svg.querySelectorAll('polygon')].map((el) => ({ kind: 'opponent', ...box(el, 0.4) })),
    ...[...svg.querySelectorAll('circle[r="3.2"]')].map((el) => round(el, 'teammate', 0.4)),
    ...[...svg.querySelectorAll('circle[r="3.4"]')].map((el) => round(el, 'marker', 0.3)),
  ];
  const vb = svg.viewBox.baseVal;
  return {
    face, label, others,
    pitch: { l: vb.x, t: vb.y, r: vb.x + vb.width, b: vb.y + vb.height },
    faceHeightPx: image.getBoundingClientRect().height,
    faces: svg.querySelectorAll('image').length,
  };
}

// A shape is either a box (l, t, r, b) or a circle (cx, cy, radius).
function overlaps(a, b) {
  if (b.radius === undefined) return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const dx = Math.max(a.l - b.cx, 0, b.cx - a.r);
  const dy = Math.max(a.t - b.cy, 0, b.cy - a.b);
  return dx * dx + dy * dy < b.radius * b.radius;
}
const inside = (a, outer) => a.l >= outer.l && a.r <= outer.r && a.t >= outer.t && a.b <= outer.b;

function problems(m) {
  const found = [];
  if (m.faces !== 1) found.push(`${m.faces} faces`);
  if (!inside(m.face, m.pitch)) found.push('face runs off the pitch');
  if (!inside(m.label, m.pitch)) found.push('YOU label runs off the pitch');
  if (overlaps(m.label, m.face)) found.push('YOU label covers the face');
  for (const o of m.others) {
    if (overlaps(m.label, o)) found.push(`YOU label covers a ${o.kind}`);
    if (o.kind !== 'opponent' && overlaps(m.face, o)) found.push(`face covers a ${o.kind}`);
  }
  if (m.faceHeightPx < MIN_FACE_PX) found.push(`face only ${m.faceHeightPx.toFixed(1)}px tall`);
  return found;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const vp of [
  { name: 'phone-375', width: 375, height: 667 },
  { name: 'small-320', width: 320, height: 568 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  console.log(`\n== ${vp.name} ==`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  // The checks measure each situation's still picture, so skip the build-up that leads into it.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const faceResponses = [];
  page.on('response', (r) => {
    if (r.url().endsWith('/players/key-player.webp')) faceResponses.push(r.status());
  });
  const noHScroll = async () => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) throw new Error(`horizontal scroll of ${over}px`);
  };
  const themeButtons = () => page.getByRole('button', { name: /situations · Play|· Play again/ });

  await page.goto(`${base}/games/`);
  await page.getByRole('tab', { name: 'Game IQ' }).click();

  await step('theme picker shows every theme and no pitch yet', async () => {
    await themeButtons().first().waitFor();
    const count = await themeButtons().count();
    if (count !== THEMES) throw new Error(`expected ${THEMES} themes, got ${count}`);
    if (await page.locator('svg[role="img"]').count()) throw new Error('pitch shown before a theme is picked');
  });

  let seen = 0;
  for (let t = 0; t < THEMES; t += 1) {
    const button = themeButtons().nth(t);
    const title = (await button.locator('span.font-bold').textContent()).trim();
    await step(`${title}: the face is YOU in every situation`, async () => {
      await button.click();
      const found = [];
      for (let i = 0; ; i += 1) {
        await page.locator('svg[role="img"] [data-key-player] image').waitFor();
        await page
          .locator('[data-live-pitch][data-stage="decide"], [data-live-pitch][data-stage="ready"]')
          .waitFor();
        const issues = problems(await page.evaluate(measure));
        if (issues.length) found.push(`situation ${i + 1}: ${issues.join(', ')}`);
        await noHScroll();
        if (vp.name === 'phone-375') {
          await page.locator('svg[role="img"]').screenshot({ path: `${SHOTS}/game-iq-${slug(title)}-${i + 1}.png` });
        }
        if (title === 'Shoot or Pass?' && i === 0) {
          await page.screenshot({ path: `${SHOTS}/game-iq-${vp.name}-shoot.png`, fullPage: true });
        }
        seen += 1;
        await page.getByRole('button', { name: /^A\. / }).click();
        const next = page.getByRole('button', { name: /Next situation|See my score/ });
        const last = /See my score/.test(await next.textContent());
        await next.click();
        if (last) break;
      }
      await page.getByRole('button', { name: 'Choose another game' }).click();
      if (found.length) throw new Error(found.join(' | '));
    });
  }

  await step(`all ${SITUATIONS} situations were checked`, async () => {
    if (seen !== SITUATIONS) throw new Error(`checked ${seen}`);
  });

  await step('the face file loads and decodes', async () => {
    if (!faceResponses.length || faceResponses.some((s) => s !== 200)) {
      throw new Error(`face responses: ${faceResponses.join(', ') || 'none'}`);
    }
    await themeButtons().first().click();
    const size = await page.evaluate(async () => {
      const img = new Image();
      img.src = document.querySelector('svg[role="img"] image').getAttribute('href');
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    });
    if (size[0] < 128 || size[0] !== size[1]) throw new Error(`decoded as ${size.join('x')}`);
  });

  await step('the pitch key shows the face next to "You"', async () => {
    const key = page.getByRole('list', { name: 'Pitch key' });
    const item = key.getByRole('listitem').filter({ hasText: 'You' }).first();
    const box = await item.locator('svg').boundingBox();
    if (!box || box.height < MIN_FACE_PX - 0.5) throw new Error(`key face is ${box?.height}px tall`);
    if (!(await item.locator('image').count())) throw new Error('no face in the key');
    await key.screenshot({ path: `${SHOTS}/game-iq-${vp.name}-key.png` });
  });

  if (vp.name === 'phone-375') {
    await step('a missing face file still leaves the orange YOU disc and no errors', async () => {
      await page.getByRole('button', { name: '← All games' }).click();
      await page.route('**/players/key-player.webp', (route) => route.fulfill({ status: 404, body: '' }));
      await page.reload();
      await page.getByRole('tab', { name: 'Game IQ' }).click();
      await themeButtons().first().click();
      const disc = page.locator('svg[role="img"] [data-key-player] circle');
      if (!(await disc.isVisible())) throw new Error('no disc');
      // The failed picture is removed rather than left as a broken-image icon.
      await page.locator('svg[role="img"] [data-key-player] image').waitFor({ state: 'detached' });
      await page.locator('svg[role="img"]').screenshot({ path: `${SHOTS}/game-iq-missing-face.png` });
      await page.unroute('**/players/key-player.webp');
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
