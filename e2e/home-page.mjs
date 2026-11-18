// End-to-end check of the home page and its video tour, in a real browser.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/home-page.mjs
// At three screen sizes: no page errors or sideways scrolling, "Get started" on the first
// screen, the four steps in order, the video downloads nothing until it is played and then plays
// (or says in words why it can't), "How it works" scrolls to the steps clear of the header, a
// question opens, and a card leads to its page. Screenshots land in e2e/screenshots (gitignored).
// Exits non-zero on any failed step.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.resolve('out');
const SHOTS = path.resolve('e2e/screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2',
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const candidates = [url, `${url}.html`, path.join(url, 'index.html')];
  const file = candidates
    .map((c) => path.join(OUT, c))
    .find((f) => f.startsWith(OUT) && fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const STEPS = [
  'Switch on your AI coach',
  'Make your player profile',
  'Train with your coach',
  'Play, think and check in',
];

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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const vp of [
  { name: 'small-320', width: 320, height: 568 },
  { name: 'phone-375', width: 375, height: 667 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  console.log(`\n== ${vp.name} ==`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  // The home page never calls an AI provider or anything else off this machine.
  await context.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  const videoRequests = [];
  page.on('request', (req) => {
    if (req.url().endsWith('.mp4')) videoRequests.push(req.url());
  });
  const shot = (name, fullPage = false) =>
    page.screenshot({ path: `${SHOTS}/home-${vp.name}-${name}.png`, fullPage });
  const noHScroll = async () => {
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(over <= 0, `horizontal scroll of ${over}px`);
  };
  const video = page.getByLabel('Video: how LuchoAI works');
  const playButton = page.getByRole('button', {
    name: /^Watch how it works \d+:\d\d · no sound$/,
  });

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  await step('the first screen says what LuchoAI is, with Get started on it', async () => {
    const title = 'Your football coach, in your pocket';
    await page.getByRole('heading', { level: 1, name: title }).waitFor();
    const start = await page.getByRole('link', { name: 'Get started' }).first().boundingBox();
    const onFirstScreen = start && start.y + start.height <= vp.height;
    expect(onFirstScreen, `Get started is below the fold (${start?.y})`);
    await noHScroll();
    await shot('1-first-screen');
    await shot('2-full', true);
  });

  await step('the video shows its poster and downloads nothing until it is played', async () => {
    const poster = await video.getAttribute('poster');
    const size = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, poster);
    expect(size.join('x') === '720x1280', `poster is ${size.join('x')}`);
    expect((await video.getAttribute('preload')) === 'none', 'preload is not none');
    expect(videoRequests.length === 0, `video requested early: ${videoRequests}`);
  });

  await step('"How it works" scrolls to the four steps, clear of the header', async () => {
    await page.getByRole('link', { name: 'How it works' }).click();
    const heading = page.getByRole('heading', { level: 2, name: 'How it works' });
    await page.waitForFunction(() => window.scrollY > 0);
    await page.waitForTimeout(300);
    const box = await heading.boundingBox();
    const header = await page.locator('header').boundingBox();
    expect(box.y >= header.y + header.height - 1, `heading under the header (${box.y})`);
    expect(box.y < vp.height / 2, `heading not near the top (${box.y})`);
    const titles = await page
      .getByRole('region', { name: 'How it works' })
      .getByRole('heading', { level: 3 })
      .allTextContents();
    expect(titles.join('|') === STEPS.join('|'), `steps: ${titles}`);
    await shot('3-steps');
  });

  await step('a question opens to show its answer', async () => {
    const answer = page.getByText(/A code, a bit like a password/);
    expect(!(await answer.isVisible()), 'answer showing before it was opened');
    await page.getByText('What is an AI key?').click();
    await answer.waitFor();
    await page.waitForTimeout(300); // let the + finish turning into a cross
    await shot('4-question-open');
  });

  await step('pressing play starts the tour, or says why it cannot', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await playButton.scrollIntoViewIfNeeded();
    await playButton.click();
    expect((await playButton.count()) === 0, 'play button still showing');
    const h264 = await page.evaluate(() =>
      document.createElement('video').canPlayType('video/mp4; codecs="avc1.64001F"'),
    );
    if (h264) {
      await page.waitForFunction(() => {
        const v = document.querySelector('video');
        return v && !v.paused && v.currentTime > 1.5;
      }, null, { timeout: 15000 });
      expect(await video.evaluate((v) => v.controls), 'no player controls after starting');
      expect(await video.evaluate((v) => v === document.activeElement), 'focus not on the video');
      expect(videoRequests.length > 0, 'the video was never requested');
    } else {
      // Builds of Chromium without H.264 (some CI images) must still explain themselves.
      await page.getByRole('status').filter({ hasText: 'The video could not load' }).waitFor();
      console.log('  (this browser has no H.264, so the fallback message was checked instead)');
    }
    await shot('5-playing');
  });

  await step('a card leads to its page without a full reload', async () => {
    await page.evaluate(() => {
      window.__sameDocument = true;
    });
    await page.getByRole('link', { name: "See this week's games" }).click();
    await page.waitForURL(`${base}/games/`);
    await page.getByRole('heading', { level: 1, name: "This week's games" }).waitFor();
    expect(await page.evaluate(() => window.__sameDocument === true), 'the page reloaded');
  });

  await step('no page errors', async () => {
    expect(errors.length === 0, errors.join(' | '));
  });
  await context.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.log(`\n${failures.length} step(s) failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAll home page steps passed');
