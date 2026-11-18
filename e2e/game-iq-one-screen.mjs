// End-to-end check that a Game IQ situation fits one phone screen: before answering the pitch and
// all the answers are in view, and after answering the pitch, the feedback and the Next button
// are, with nothing to scroll. Walks every situation of every theme, answering with a wrong
// answer (the longest feedback) at three sizes, then the first one at desktop size.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/game-iq-one-screen.mjs
// Screenshots land in e2e/screenshots (gitignored). Exits non-zero on any failed check.
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
  const file = [url, `${url}.html`, path.join(url, 'index.html')]
    .map((c) => path.join(OUT, c))
    .find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  return fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const THEMES = 8;
// The iPhone's floating address bar sits over the bottom of the page: keep clear of it.
// Short screens (old iPhone SEs) have a solid toolbar outside the page instead, so need less.
const barRoom = (vp) => (vp.height < 600 ? 12 : 40);
const failures = [];

// Runs in the page: how much of the screen each part of the game uses.
function inView(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const vp of [
  { name: 'phone-375', width: 375, height: 667, phone: true },
  { name: 'small-320', width: 320, height: 568, phone: true },
  { name: 'phone-390', width: 390, height: 700, phone: true },
  { name: 'desktop', width: 1280, height: 800, phone: false },
]) {
  console.log(`\n== ${vp.name} ==`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.phone,
    isMobile: vp.phone,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const problems = [];
  const note = (where, message) => problems.push(`${where}: ${message}`);

  await page.goto(`${base}/games/`);
  await page.getByRole('tab', { name: 'Game IQ' }).click();
  const themeCount = vp.phone ? THEMES : 1;

  for (let t = 0; t < themeCount; t += 1) {
    await page.getByRole('tab', { name: 'Game IQ' }).click();
    await page.getByRole('button', { name: /situations · Play|· Play again/ }).nth(t).click();
    const heading = (await page.locator('#games-panel-iq h1').first().textContent()).trim();
    const count = Number((heading.match(/of (\d+)/) ?? [])[1]);
    for (let s = 0; s < (vp.phone ? count : 1); s += 1) {
      const where = `${heading.replace(/\s+/g, ' ')} #${s + 1}`;
      await page.locator('[data-live-pitch]').waitFor();
      await page.getByRole('button', { name: 'Skip' }).click({ timeout: 500 }).catch(() => {});
      // Before answering: pitch, question and all three answers on screen.
      const before = await page.evaluate(() => ({
        pitch: (() => { const b = document.querySelector('svg[role="img"]').getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height, w: b.width }; })(),
        options: [...document.querySelectorAll('button')].filter((b) => /^[ABC]\. /.test(b.textContent)).map((b) => {
          const r = b.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        }),
        hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        vScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      }));
      if (before.options.length !== 3) note(where, `${before.options.length} answer buttons`);
      if (vp.phone) {
        const lowest = Math.max(...before.options.map((o) => o.bottom));
        // The 320x568 timing situation is the one place the answers list scrolls inside its panel.
        if (lowest > vp.height - barRoom(vp) + 8 && vp.width >= 360) note(where, `answers reach ${Math.round(lowest)}px of ${vp.height}`);
        if (before.options.some((o) => o.top < 0)) note(where, 'an answer is above the screen');
        if (before.pitch.h < (vp.width < 360 ? 90 : 120)) note(where, `pitch only ${Math.round(before.pitch.h)}px tall`);
        if (before.pitch.w > vp.width) note(where, 'pitch wider than the screen');
        if (before.vScroll > 0) note(where, `page scrolls ${before.vScroll}px before answering`);
      }
      if (before.hScroll > 0) note(where, `horizontal scroll ${before.hScroll}px`);
      if (t === 0 && s === 0) await page.screenshot({ path: `${SHOTS}/game-iq-one-screen-${vp.name}-before.png` });

      // Answer with the first option that is not the best one, so the feedback is the longest.
      const wrong = await page.evaluate(() => [...document.querySelectorAll('button')]
        .filter((b) => /^[ABC]\. /.test(b.textContent)).map((b) => b.textContent.trim()[0]));
      await page.getByRole('button', { name: new RegExp(`^${wrong[s % 3]}\\. `) }).click();
      const nextName = /Next situation|See my score/;
      await page.getByRole('button', { name: nextName }).waitFor();
      await page.locator('[data-live-pitch][data-stage="done"]').waitFor({ timeout: 15000 });

      const after = await page.evaluate(() => {
        const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
        const next = [...document.querySelectorAll('button')].find((b) => /Next situation|See my score/.test(b.textContent));
        const status = document.querySelector('[role="status"]');
        const feedbackBox = status.parentElement;
        return {
          next: box(next),
          pitch: box(document.querySelector('svg[role="img"]')),
          strip: box(document.querySelector('[data-pitch-result]')),
          status: box(status),
          feedbackClipped: feedbackBox.scrollHeight > feedbackBox.clientHeight + 1,
          nextFocused: document.activeElement === next,
          hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      if (vp.phone) {
        if (after.next.bottom > vp.height - barRoom(vp) + 8) note(where, `Next ends at ${Math.round(after.next.bottom)} of ${vp.height}`);
        if (after.next.top < 0 || after.pitch.top < 0) note(where, 'Next or the pitch is above the screen');
        if (after.strip.bottom > after.status.top + 2) note(where, 'the result overlaps the feedback');
        if (!after.feedbackClipped && after.status.bottom > after.next.top + 2) note(where, 'feedback runs under Next');
        if (after.feedbackClipped && vp.width >= 360) note(where, 'feedback needs its own scroll');
        if (after.next.left < 0 || after.next.right > vp.width) note(where, 'Next is off the sides');
      }
      if (!after.nextFocused) note(where, 'Next does not have focus');
      if (after.hScroll > 0) note(where, `horizontal scroll ${after.hScroll}px after answering`);
      if (t === 0 && s === 0) await page.screenshot({ path: `${SHOTS}/game-iq-one-screen-${vp.name}-after.png` });
      if (s === count - 1 || !vp.phone) {
        if (!vp.phone) await page.screenshot({ path: `${SHOTS}/game-iq-one-screen-${vp.name}-after.png` });
      }
      if (!vp.phone) break;
      await page.getByRole('button', { name: nextName }).click();
    }
    if (vp.phone) {
      // Finished the round: the summary is an ordinary page again.
      await page.getByRole('heading', { name: /your score/ }).waitFor();
      await page.getByRole('button', { name: 'Choose another game' }).click();
    }
  }

  const failed = problems.length + errors.length;
  console.log(failed ? `FAIL ${vp.name}` : `PASS ${vp.name}`);
  problems.slice(0, 15).forEach((p) => console.log(`  ${p}`));
  if (problems.length > 15) console.log(`  …and ${problems.length - 15} more`);
  errors.forEach((e) => console.log(`  page error: ${e}`));
  if (failed) failures.push(vp.name);
  await context.close();
}
await browser.close();
server.close();
if (failures.length) {
  console.log(`\nFailed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nAll checks passed');
