// End-to-end check of Game IQ in motion, in a real browser: the build-up plays, you answer on the
// pitch by dragging YOU or the ball (mouse or finger) or by tapping a letter, and the pitch plays
// out what happens.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/game-iq-motion.mjs
// At three screen sizes it runs the real-time flows (build-up, drag, tap, keyboard, GO!), then
// answers all 30 situations on the pitch, checking no answer letter covers a player and every tap
// target is big enough for a finger. Screenshots land in e2e/screenshots (gitignored).
// Exits non-zero on any failed step.
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
// WCAG 2.5.8 asks for tap targets of at least 24 by 24 CSS pixels.
const MIN_TARGET_PX = 24;

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
const expect = (ok, message) => {
  if (!ok) throw new Error(message);
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Runs in the page: the answer letters and everything they must not cover, in pitch units.
function measure() {
  const svg = document.querySelector('svg[role="img"]');
  const num = (el, a) => Number(el.getAttribute(a));
  const disc = svg.querySelector('[data-key-player] circle');
  const you = { x: num(disc, 'cx'), y: num(disc, 'cy') - 1.32 };
  // YOU is the round head plus the orange collar below it; the face art has see-through corners.
  const shapes = [
    { kind: 'YOU', x: you.x, y: you.y, r: 5.3 },
    { kind: 'YOU', x: you.x, y: you.y + 1.32, r: 5.1 },
    ...[...svg.querySelectorAll('circle[r="3.2"]')].map((c) => ({
      kind: 'teammate', x: num(c, 'cx'), y: num(c, 'cy'), r: 3.2,
    })),
    ...[...svg.querySelectorAll('circle[r="1.7"]')]
      .filter((c) => !c.getAttribute('opacity'))
      .map((c) => ({ kind: 'ball', x: num(c, 'cx'), y: num(c, 'cy'), r: 1.7 })),
  ];
  const triangles = [...svg.querySelectorAll('polygon')].map((p) =>
    p.getAttribute('points').split(' ').map((xy) => xy.split(',').map(Number)),
  );
  const label = [...svg.querySelectorAll('text')].find((t) => t.textContent === 'YOU');
  const lb = label.getBBox();
  const baseline = num(label, 'y');
  const labelBox = { l: lb.x - 0.4, r: lb.x + lb.width + 0.4, t: baseline - 2.85, b: baseline + 0.4 };
  const letters = [...svg.querySelectorAll('[data-marker] circle')]
    .filter((c) => ['3.4', '2.9'].includes(c.getAttribute('r')) && c.getAttribute('fill') !== 'transparent')
    .map((c) => ({
      id: c.closest('[data-marker]').getAttribute('data-marker'),
      x: num(c, 'cx'), y: num(c, 'cy'), r: num(c, 'r'),
    }));
  // Every answer has its letter to tap (and YOU or the ball to drag), each at least finger-sized.
  // Rings and the goal frame are bigger extra targets on top of that.
  const fingerTargets = '[data-marker] circle[fill="transparent"][r="6"], ' +
    '[data-marker] circle[fill="transparent"][r="4.6"], [data-draggable]';
  const hits = [...svg.querySelectorAll(fingerTargets)].map((el) => {
    const b = el.getBoundingClientRect();
    return Math.min(b.width, b.height);
  });
  const vb = svg.viewBox.baseVal;
  return {
    letters, shapes, triangles, labelBox,
    pitch: { w: vb.width, h: vb.height },
    vw: innerWidth,
    minHitPx: Math.min(...hits),
    faces: svg.querySelectorAll('image').length,
  };
}

function gapToTriangle(p, corners) {
  const side = ([ax, ay], [bx, by]) => (bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax);
  const signs = corners.map((c, i) => Math.sign(side(c, corners[(i + 1) % 3])));
  if (signs.every((s) => s >= 0) || signs.every((s) => s <= 0)) return 0;
  return Math.min(...corners.map(([ax, ay], i) => {
    const [bx, by] = corners[(i + 1) % 3];
    const t = Math.max(0, Math.min(1, ((p.x - ax) * (bx - ax) + (p.y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    return Math.hypot(p.x - (ax + t * (bx - ax)), p.y - (ay + t * (by - ay)));
  }));
}

function letterProblems(m) {
  const found = [];
  if (m.faces !== 1) found.push(`${m.faces} faces`);
  if (m.letters.length !== 3) found.push(`${m.letters.length} letters`);
  m.letters.forEach((a, i) => {
    m.shapes.forEach((s) => {
      if (Math.hypot(a.x - s.x, a.y - s.y) < a.r + s.r) found.push(`${a.id} covers a ${s.kind}`);
    });
    if (m.triangles.some((t) => gapToTriangle(a, t) < a.r)) found.push(`${a.id} covers an opponent`);
    const dx = Math.max(m.labelBox.l - a.x, 0, a.x - m.labelBox.r);
    const dy = Math.max(m.labelBox.t - a.y, 0, a.y - m.labelBox.b);
    if (Math.hypot(dx, dy) < a.r) found.push(`${a.id} covers the YOU label`);
    if (a.x - a.r < 0 || a.x + a.r > m.pitch.w || a.y - a.r < 0 || a.y + a.r > m.pitch.h) {
      found.push(`${a.id} runs off the pitch`);
    }
    m.letters.slice(i + 1).forEach((b) => {
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) found.push(`${a.id} and ${b.id} overlap`);
    });
  });
  // On a 320px-wide phone the pitch is as big as the room under it allows; the A/B/C buttons
  // below it are the full-size way to answer, so the on-pitch targets only need to be tappable.
  const minTarget = m.vw < 360 ? 12 : MIN_TARGET_PX;
  if (m.minHitPx < minTarget) found.push(`a tap target is only ${m.minHitPx.toFixed(1)}px`);
  return found;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const vp of [
  { name: 'phone-375', width: 375, height: 667, touch: true },
  { name: 'small-320', width: 320, height: 568, touch: true },
  { name: 'desktop', width: 1280, height: 800, touch: false },
]) {
  console.log(`\n== ${vp.name} ==`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
  });
  const page = await context.newPage();
  const cdp = vp.touch ? await context.newCDPSession(page) : null;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const stage = () => page.locator('[data-live-pitch]').getAttribute('data-stage');
  const waitStage = (...names) =>
    page.locator(names.map((n) => `[data-live-pitch][data-stage="${n}"]`).join(', ')).waitFor({ timeout: 15000 });
  const center = async (locator) => {
    const b = await locator.boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  // Pitch units (100 x 75) to page pixels.
  const toScreen = async ({ x, y }) => {
    const b = await page.locator('svg[role="img"]').boundingBox();
    return { x: b.x + (x / 100) * b.width, y: b.y + (y / 75) * b.height };
  };
  const scrollY = () => page.evaluate(() => window.scrollY);
  const noHScroll = async () => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over <= 0, `horizontal scroll of ${over}px`);
  };
  const hint = () => page.locator('[data-pitch-hint]').textContent();
  const result = () => page.locator('[data-pitch-result]').textContent();

  // Drags with the mouse, or with a finger on touch screens. `during` runs before letting go.
  async function drag(from, to, during) {
    const steps = 12;
    const at = (i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
    if (cdp) {
      const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
      await touch('touchStart', from);
      for (let i = 1; i <= steps; i += 1) await touch('touchMove', at(i));
      if (during) await during();
      await touch('touchEnd');
    } else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let i = 1; i <= steps; i += 1) await page.mouse.move(at(i).x, at(i).y);
      if (during) await during();
      await page.mouse.up();
    }
  }
  async function tap(point) {
    if (vp.touch) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
  }
  async function letterPoint(letter) {
    const marker = page.locator(`[data-marker="${letter}"]`);
    const kind = await marker.getAttribute('data-kind');
    return center(marker.locator(`circle[r="${kind === 'spot' ? '3.4' : '2.9'}"]`).first());
  }
  // Drops on what the answer stands for: the spot, the player in the ring, or the goal.
  async function dropPoint(letter) {
    const [x, y] = (await page.locator(`[data-marker="${letter}"]`).getAttribute('data-at')).split(',').map(Number);
    return toScreen({ x, y });
  }
  async function answerOnPitch(letter, method) {
    const own = (await page.locator(`[data-marker="${letter}"]`).getAttribute('data-own')) !== null;
    // "Stay where you are" sits on your own ring: you answer it with its letter.
    if (method === 'tap' || own) await tap(await letterPoint(letter));
    else await drag(await center(page.locator('[data-draggable]')), await dropPoint(letter));
  }
  const themeButton = (name) => page.getByRole('button', { name: new RegExp(`${name}.*(situations · Play|· Play again)`) });
  const allGames = () => page.getByRole('button', { name: '← All games' }).click();
  const next = () => page.getByRole('button', { name: /Next situation|See my score/ }).click();

  await page.goto(`${base}/games/`);
  await step('"Play this round" on This week opens Game IQ with the build-up playing', async () => {
    await page.getByRole('button', { name: 'Play this round' }).click();
    await waitStage('lead');
    const selected = await page.getByRole('tab', { name: 'Game IQ' }).getAttribute('aria-selected');
    expect(selected === 'true', 'the Game IQ tab is not showing');
    await allGames();
  });
  await page.getByRole('tab', { name: 'Game IQ' }).click();
  await themeButton('Move into Space').click();

  await step('the build-up moves the players into the picture', async () => {
    expect((await stage()) === 'lead', `starts at ${await stage()}`);
    const face = page.locator('svg[role="img"] [data-key-player] image');
    const early = await face.boundingBox();
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `${SHOTS}/game-iq-motion-${vp.name}-lead.png` });
    await waitStage('decide');
    const late = await face.boundingBox();
    const moved = Math.hypot(late.x - early.x, late.y - early.y);
    expect(moved > 10, `YOU only moved ${moved.toFixed(1)}px`);
    await noHScroll();
    await page.screenshot({ path: `${SHOTS}/game-iq-motion-${vp.name}-decide.png` });
  });

  await step('Replay plays the build-up again and Skip jumps to the picture', async () => {
    await page.getByRole('button', { name: 'Replay' }).click();
    await waitStage('lead');
    await page.getByRole('button', { name: 'Skip' }).click();
    await waitStage('decide');
  });

  if (vp.touch) {
    await step('a phone round fits the screen, so there is nothing to scroll', async () => {
      const spare = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      expect(spare <= 0, `the page scrolls ${spare}px`);
    });
  }

  await step('tapping YOU asks for a drag; dropping away from the letters answers nothing', async () => {
    await tap(await center(page.locator('[data-draggable]')));
    expect((await hint()).includes('Press and hold YOU'), `hint: ${await hint()}`);
    await drag(await center(page.locator('[data-draggable]')), await toScreen({ x: 10, y: 66 }));
    expect((await hint()).includes('not on a letter'), `hint: ${await hint()}`);
    expect((await page.getByRole('status').count()) === 0, 'an answer was given');
    expect((await stage()) === 'decide', `stage ${await stage()}`);
  });

  await step('dragging YOU onto a letter answers it, then the pitch plays out what happens', async () => {
    const before = await scrollY();
    await drag(await center(page.locator('[data-draggable]')), await dropPoint('A'), async () => {
      expect((await hint()) === 'Let go for A: Run further up the pitch', `hint: ${await hint()}`);
      if (vp.touch) expect((await scrollY()) === before, 'dragging scrolled the page');
      await page.screenshot({ path: `${SHOTS}/game-iq-motion-${vp.name}-dragging.png` });
    });
    await page.getByRole('status').filter({ hasText: 'Good try' }).waitFor();
    expect((await stage()) === 'outcome', `stage ${await stage()}`);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/game-iq-motion-${vp.name}-outcome.png` });
    await waitStage('done');
    expect((await result()) === 'Intercepted!', `result ${await result()}`);
    await page.screenshot({ path: `${SHOTS}/game-iq-motion-${vp.name}-done.png`, fullPage: true });
  });

  await step('"See the best choice" plays the right answer, and Watch again replays it', async () => {
    await page.getByRole('button', { name: 'See the best choice' }).click();
    await waitStage('outcome');
    await waitStage('done');
    expect((await result()) === 'Pass arrives!', `result ${await result()}`);
    await page.getByText('Best choice B: Move a few steps to the side').waitFor();
    await page.getByRole('button', { name: 'Watch again' }).click();
    await waitStage('outcome');
    await waitStage('done');
  });

  await step('keyboard: an answer button works with Enter, then Next takes the focus', async () => {
    await next();
    await page.getByRole('button', { name: /^A\. / }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').waitFor();
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(/Next situation/.test(focused), `focus on "${focused}"`);
    await page.keyboard.press('Enter');
    await page.locator('[data-live-pitch]').waitFor();
  });

  await step('the ball goes where you drag it: into space, then back to a teammate', async () => {
    await allGames();
    await themeButton('First Touch').click();
    await waitStage('decide');
    await answerOnPitch('C', 'drag');
    await page.getByRole('status').filter({ hasText: 'Great decision!' }).waitFor();
    await waitStage('done');
    expect((await result()) === 'Space to play!', `result ${await result()}`);
    await next();
    await waitStage('decide');
    await answerOnPitch('A', 'drag');
    await page.getByRole('status').filter({ hasText: 'Great decision!' }).waitFor();
    await waitStage('done');
    expect((await result()) === 'Kept it!', `result ${await result()}`);
  });

  await step('"when" questions: tap GO! as the passer looks up', async () => {
    await allGames();
    await themeButton('Move into Space').click();
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: /^A\. / }).click();
      await next();
    }
    await waitStage('ready');
    await page.getByRole('button', { name: 'Start' }).click();
    await page.locator('[data-callout] text', { hasText: 'Head down' }).waitFor();
    await page.locator('[data-callout] text', { hasText: 'Looks up!' }).waitFor({ timeout: 6000 });
    await page.screenshot({ path: `${SHOTS}/game-iq-motion-${vp.name}-go.png` });
    await page.getByRole('button', { name: 'GO!' }).click();
    await page.getByRole('status').filter({ hasText: 'Great decision!' }).waitFor();
    await waitStage('done');
    expect((await result()) === 'Perfect timing!', `result ${await result()}`);
    await noHScroll();
  });

  // Every situation, answered on the pitch. Reduced motion skips straight to each picture.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/games/`);
  await page.getByRole('tab', { name: 'Game IQ' }).click();
  let seen = 0;
  for (let t = 0; t < THEMES; t += 1) {
    const button = page.getByRole('button', { name: /situations · Play|· Play again/ }).nth(t);
    const title = (await button.locator('span.font-bold').textContent()).trim();
    await step(`${title}: every situation answered on the pitch, letters clear of everyone`, async () => {
      await button.click();
      const found = [];
      for (let i = 0; ; i += 1) {
        await waitStage('decide', 'ready');
        await noHScroll();
        if ((await stage()) === 'ready') {
          await page.getByRole('button', { name: 'Start' }).click();
          await page.locator('[data-callout] text', { hasText: 'Looks up!' }).waitFor({ timeout: 6000 });
          await page.getByRole('button', { name: 'GO!' }).click();
        } else {
          const issues = letterProblems(await page.evaluate(measure));
          if (issues.length) found.push(`situation ${i + 1}: ${issues.join(', ')}`);
          if (vp.name === 'phone-375') {
            await page.locator('svg[role="img"]').screenshot({ path: `${SHOTS}/game-iq-motion-${slug(title)}-${i + 1}.png` });
          }
          const letter = 'ABC'[seen % 3];
          const method = seen % 2 === 0 ? 'drag' : 'tap';
          await answerOnPitch(letter, method);
        }
        await page.getByRole('status').waitFor({ timeout: 8000 }).catch(() => {
          found.push(`situation ${i + 1}: no answer registered`);
        });
        await waitStage('done');
        if (!(await result())) found.push(`situation ${i + 1}: no result shown`);
        seen += 1;
        const nextButton = page.getByRole('button', { name: /Next situation|See my score/ });
        const last = /See my score/.test(await nextButton.textContent());
        await nextButton.click();
        if (last) break;
      }
      await page.getByRole('button', { name: 'Choose another game' }).click();
      expect(found.length === 0, found.join(' | '));
    });
  }

  await step(`all ${SITUATIONS} situations were answered`, async () => {
    expect(seen === SITUATIONS, `answered ${seen}`);
  });

  await step('no page errors', async () => {
    expect(errors.length === 0, errors.join('; '));
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
