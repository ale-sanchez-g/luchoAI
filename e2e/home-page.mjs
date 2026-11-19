// End-to-end check of the home page and its video tour, in a real browser.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/home-page.mjs
// At three screen sizes: no page errors or sideways scrolling, "Get started" on the first
// screen, the four steps in order, the video downloads nothing until it is played and then plays
// with its AI voice on (or says in words why it can't), the voice is heard while a line plays and
// not between lines, muting keeps it playing, a browser that blocks sound gets the video without
// it and a note, a missing video says so, "How it works" scrolls to the steps clear of the
// header, a question opens, and a card leads to its page. Screenshots land in e2e/screenshots
// (gitignored). Exits non-zero on any failed step. e2e/tour-video-sync.mjs checks the video file.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

// When each voice-over line starts in the video: tests seek by these, never by fixed seconds.
const TIMELINE = JSON.parse(fs.readFileSync('scripts/tour-voice/timeline.json', 'utf8')).lines;

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
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  // Byte ranges, as GitHub Pages answers them: without them Chrome can't seek in the video.
  const size = fs.statSync(file).size;
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
  if (range && Number(range[1]) < size) {
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, {
      'content-type': type,
      'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${size}`,
      'content-length': end - start + 1,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size });
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
    name: /^Watch how it works \d+:\d\d · with sound$/,
  });
  const h264 = await page.evaluate(() =>
    document.createElement('video').canPlayType('video/mp4; codecs="avc1.64001F, mp4a.40.2"'),
  );

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

  await step('pressing play starts the tour with its voice on, or says why it cannot', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.getByText(/read out by an AI\svoice/).isVisible(), 'no AI-voice note');
    await playButton.scrollIntoViewIfNeeded();
    await playButton.click();
    expect((await playButton.count()) === 0, 'play button still showing');
    if (h264) {
      await page.waitForFunction(() => {
        const v = document.querySelector('video');
        return v && !v.paused && v.currentTime > 1.5;
      }, null, { timeout: 15000 });
      expect(await video.evaluate((v) => v.controls), 'no player controls after starting');
      expect(await video.evaluate((v) => v === document.activeElement), 'focus not on the video');
      expect(videoRequests.length > 0, 'the video was never requested');
      expect(!(await video.evaluate((v) => v.muted)), 'the voice is muted');
      const audio = await video.evaluate((v) => v.webkitAudioDecodedByteCount ?? 1);
      expect(audio > 0, 'no sound has been decoded');
    } else {
      // Builds of Chromium without H.264 (some CI images) must still explain themselves.
      await page.getByRole('status').filter({ hasText: 'The video could not load' }).waitFor();
      console.log('  (this browser has no H.264, so the fallback message was checked instead)');
    }
    await shot('5-playing');
  });

  await step('the voice speaks while a line plays, and is quiet either side', async () => {
    if (!h264) return;
    // "Then pastes in the AI key. It stays on this device." with a breath on either side.
    const line = TIMELINE.find((l) => l.id === 'step1-3');
    const end = line.start + line.ms / 1000;
    // Listens through Web Audio, by the video's own clock, from just before the line to after it.
    const levels = await video.evaluate(async (v, [from, to]) => {
      if (v.paused) throw new Error('the video is not playing');
      const audio = new AudioContext();
      await audio.resume();
      const analyser = audio.createAnalyser();
      audio.createMediaElementSource(v).connect(analyser);
      analyser.connect(audio.destination);
      const wave = new Float32Array(analyser.fftSize);
      v.currentTime = from;
      await new Promise((resolve, reject) => {
        v.addEventListener('seeked', resolve, { once: true });
        setTimeout(() => reject(new Error('the video did not seek')), 10000);
      });
      const heard = [];
      while (v.currentTime < to && !v.paused) {
        await new Promise((r) => requestAnimationFrame(r));
        analyser.getFloatTimeDomainData(wave);
        heard.push([v.currentTime, Math.sqrt(wave.reduce((s, x) => s + x * x, 0) / wave.length)]);
      }
      return heard;
    }, [line.start - 0.5, end + 0.5]);
    const loudest = (from, to) =>
      Math.max(0, ...levels.filter(([t]) => t > from && t < to).map(([, level]) => level));
    const speaking = loudest(line.start + 0.2, end - 0.2);
    const quiet = Math.max(
      loudest(line.start - 0.45, line.start - 0.15),
      loudest(end + 0.2, end + 0.45),
    );
    console.log(`  loudest while speaking ${speaking.toFixed(3)}, around it ${quiet.toFixed(4)}`);
    expect(speaking > 0.02, `the voice is not heard during ${line.id} (${speaking})`);
    expect(quiet < speaking / 10, `sound in the breath around ${line.id} (${quiet})`);
  });

  await step('muting keeps the video playing', async () => {
    if (!h264) return;
    const before = await video.evaluate((v) => {
      v.muted = true;
      return v.currentTime;
    });
    await page.waitForTimeout(800);
    const after = await video.evaluate((v) => (v.paused ? -1 : v.currentTime));
    expect(after > before + 0.4, `video stopped when muted (${before} -> ${after})`);
  });

  await step('a browser that blocks sound gets the video without it, and a note', async () => {
    const quiet = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await quiet.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    // Like a browser set to block sound: only muted videos may play.
    await quiet.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function playMutedOnly() {
        if (this.muted) return play.call(this);
        return Promise.reject(new DOMException('Sound is blocked', 'NotAllowedError'));
      };
    });
    const quietPage = await quiet.newPage();
    quietPage.on('pageerror', (e) => errors.push(e.message));
    await quietPage.goto(`${base}/`, { waitUntil: 'networkidle' });
    await quietPage.getByRole('button', { name: /^Watch how it works/ }).click();
    if (h264) {
      const note = quietPage.getByText('The sound is off, but the words are on screen.');
      await note.waitFor();
      await quietPage.waitForFunction(() => {
        const v = document.querySelector('video');
        return v && v.muted && !v.paused && v.currentTime > 1;
      }, null, { timeout: 15000 });
      await note.scrollIntoViewIfNeeded();
      const over = await quietPage.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over <= 0, `horizontal scroll of ${over}px`);
      await quietPage.screenshot({ path: `${SHOTS}/home-${vp.name}-6-sound-blocked.png` });
      // The player's speaker turns the sound on, and the note goes.
      await quietPage.evaluate(() => {
        document.querySelector('video').muted = false;
      });
      await note.waitFor({ state: 'detached' });
    } else {
      await quietPage.getByRole('status').filter({ hasText: 'The video could not load' }).waitFor();
    }
    await quiet.close();
  });

  await step('a video that will not load says so, and points to the steps', async () => {
    const broken = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await broken.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    await broken.route('**/how-luchoai-works.mp4', (route) => route.fulfill({ status: 404 }));
    const brokenPage = await broken.newPage();
    brokenPage.on('pageerror', (e) => errors.push(e.message));
    await brokenPage.goto(`${base}/`, { waitUntil: 'networkidle' });
    await brokenPage.getByRole('button', { name: /^Watch how it works/ }).click();
    const message = brokenPage.getByRole('status').filter({ hasText: 'The video could not load' });
    await message.waitFor();
    await message.scrollIntoViewIfNeeded();
    await brokenPage.screenshot({ path: `${SHOTS}/home-${vp.name}-7-video-missing.png` });
    await broken.close();
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
