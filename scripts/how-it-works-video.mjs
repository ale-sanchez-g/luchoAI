// Records the "How LuchoAI works" video shown on the home page, from the real app in a browser.
//
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && npm run tour-video
// Build without GEMINI_FREE_API_KEY: the "Try it free" button only exists on some builds, so the
// tour shows the set-up screen that every build has. Needs ffmpeg on the PATH. Writes
// public/video/how-luchoai-works.mp4 (H.264 720x1280 with an AAC voice-over) and its poster,
// plus scripts/tour-voice/timeline.json (when each line starts), checks the voice and captions
// are in sync (e2e/tour-video-sync.mjs) and prints the length: update TOUR_LENGTH in
// src/components/HowItWorksVideo.tsx if it no longer fits. Re-run it whenever a screen the tour
// shows changes.
//
// The app runs in an iframe on a "stage" page that adds the caption strip, a finger that shows
// each tap and the title cards. Every AI reply is canned with a route, so the script never calls
// a real AI provider and needs no key. Frames come from Chrome's screencast and keep the time
// they were drawn, so the video plays at the speed the tour ran.
//
// The words come from scripts/tour-voice/lines.json: each line is one caption and one recording
// in scripts/tour-voice/clips (made by scripts/tour-voice/generate.py; see README.md). A line
// stays up for its recording plus a breath, so the voice is never cut off or talked over, and a
// browser records no sound: the clips are laid into the video at the moment each caption shows.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.resolve('out');
const VIDEO_DIR = path.resolve('public/video');
const VIDEO = path.join(VIDEO_DIR, 'how-luchoai-works.mp4');
const POSTER = path.join(VIDEO_DIR, 'how-luchoai-works-poster.webp');
const FAILED_SHOT = path.resolve('e2e/screenshots/tour-video-failed.png');
const FPS = 30;
// A 9:16 phone screen, drawn at 16/9 device pixels so it records at 720x1280.
const STAGE = { width: 405, height: 720 };
const SCALE = 16 / 9;
const CAPTION_HEIGHT = 104;
// Wednesday 18 November 2026, 4:30 pm in Sydney.
const TOUR_TIME = new Date('2026-11-18T05:30:00Z');
// The app's sticky header: scrolling never parks a target underneath it.
const APP_HEADER = 56;

const VOICE_DIR = path.resolve('scripts/tour-voice');
const CLIPS = path.join(VOICE_DIR, 'clips');
const TIMELINE = path.join(VOICE_DIR, 'timeline.json');
const LINES = JSON.parse(fs.readFileSync(path.join(VOICE_DIR, 'lines.json'), 'utf8'));
const LINE = Object.fromEntries(LINES.map((line) => [line.id, line]));
// Kokoro speaks at 24 kHz, so the soundtrack keeps that rate.
const VOICE_RATE = 24000;
// Quiet after every line, so each one lands before the next starts.
const BREATH_MS = 600;
// The caption strip fades the old words out over this long before showing the new ones.
const CAPTION_FADE_MS = 230;
const AI_VOICE = 'Voice-over: AI-generated with Kokoro-82M (bf_emma)';

// The four steps of "How it works" on the home page, word for word (HomePage.test.tsx checks):
// the lines that read "Step 1: <title>." and so on.
const STEP_TITLE = /^Step (\d): (.+)\.$/;
const STEPS = LINES.flatMap((line) => line.text.match(STEP_TITLE)?.[2] ?? []);
const STEP_NOTES = [
  'A grown-up adds an AI key',
  'Five quick questions',
  'Ask anything, get a weekly plan',
  'Games, Game IQ and how you feel',
];

const CHAT_REPLY = `Great question, Mia! A good first touch gives you time to pick your next move.

- **Look before it arrives.** Check over your shoulder so you know where to go.
- **Soft foot.** Relax your foot as the ball lands, like catching an egg.
- **Touch it into space.** Push it away from the defender, not under your feet.

Try 50 passes against a wall with both feet and count your clean touches. Then beat it!`;

const drill = (name, duration, setup, description, coachingPoints) => ({
  name, duration, setup, description, coachingPoints,
});
// Mia is 11, so her profile starts as "still exploring" and the plan tries different spots.
const COOL_DOWN = drill('Cool down', 8, 'cool-down', 'Walk, then stretch gently.', [
  'Breathe slowly',
]);
const PLAN = {
  weeklyGoal: 'Try a new spot on the pitch each session, starting with a sharper first touch',
  sessions: [
    {
      id: 'session-1',
      title: 'Midfield: soft first touch',
      duration: 45,
      focus: 'Receiving with both feet',
      notes: 'Take a rest day before the next session.',
      drills: [
        drill('Wall pass and control', 12, 'wall',
          'Pass the ball against a wall, then stop it with the inside of your foot. ' +
            'Swap feet every 10 passes.',
          ['Relax your foot as the ball arrives', 'Look up before it comes back']),
        drill('Gate turns', 15, 'gates',
          'Set up two cones as a gate. Your helper passes, you take a touch through the gate ' +
            'and turn.',
          ['Open your body to see the gate', 'Touch it into space']),
        drill('Cone dribble', 10, 'slalom',
          'Dribble in and out of a line of cones using small touches, then dribble back.',
          ['Keep the ball close', 'Use both feet']),
        COOL_DOWN,
      ],
    },
    ...[
      ['Up front: shoot and score', 'Finishing'],
      ['At the back: win it back', 'Defending 1v1'],
      ['Fun finish', 'Play anywhere'],
    ].map(([title, focus], i) => ({
      id: `session-${i + 2}`,
      title,
      duration: 45,
      focus,
      notes: i === 2 ? 'A lighter session to end the week.' : 'Take a rest day after this one.',
      drills: [
        drill('Ball mastery', 15, 'ball-mastery', 'Toe taps, sole rolls and pull-backs.',
          ['Stay on your toes']),
        drill('Wall pass and turn', 22, 'wall', 'Pass, control and turn away from the wall.',
          ['Check your shoulder first']),
        COOL_DOWN,
      ],
    })),
  ],
};

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} failed:\n${result.stderr || result.error}`);
  return result.stdout.trim();
}

// A recording as mono samples at the soundtrack's rate.
function decodeClip(file) {
  const result = spawnSync('ffmpeg', [
    '-v', 'error', '-i', file, '-ac', '1', '-ar', String(VOICE_RATE), '-f', 'f32le', '-',
  ], { maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`ffmpeg could not read ${file}:\n${result.stderr}`);
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
}

const homeHtml = path.join(OUT, 'index.html');
if (!fs.existsSync(homeHtml)) {
  fail('No out/ folder. Run: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build');
}
const home = fs.readFileSync(homeHtml, 'utf8');
if (!home.includes('"/_next/')) {
  fail('out/ has a base path. Rebuild with NEXT_PUBLIC_BASE_PATH= (empty).');
}
if (spawnSync('ffmpeg', ['-version']).status !== 0) fail('ffmpeg is not installed (ffmpeg.org).');
const appCss = home.match(/href="(\/_next\/static\/[^"]+\.css)"/)?.[1];
if (!appCss) fail('Could not find the app stylesheet in out/index.html.');

const clipFile = (id) => path.join(CLIPS, `${id}.mp3`);
const lengthsFile = path.join(CLIPS, 'lengths.json');
const RECORDED = fs.existsSync(lengthsFile)
  ? JSON.parse(fs.readFileSync(lengthsFile, 'utf8')).lines
  : {};
// A line edited after its recording would be timed by the old length and say the old words.
const stale = LINES.filter(
  (line) => RECORDED[line.id]?.text !== line.text || !fs.existsSync(clipFile(line.id)),
);
if (stale.length) {
  fail(
    `No up-to-date recording for ${stale.map((line) => line.id).join(', ')}. Record the voice ` +
      'again with scripts/tour-voice/generate.py (see README.md).',
  );
}
const numbered = LINES.flatMap((line) => line.text.match(STEP_TITLE)?.[1] ?? []);
if (numbered.join() !== STEP_NOTES.map((_, i) => i + 1).join()) {
  fail(`lines.json must open each of the ${STEP_NOTES.length} steps with "Step n: <title>."`);
}

// A title card shows its line as a heading (the first sentence) over paragraphs (the rest).
function cardHtml(id) {
  const [heading, ...rest] = LINE[id].text.match(/[^.!?]+[.!?]+/g).map((s) => s.trim());
  const paragraphs = rest.map((s) => `<p>${s.replace('Get started', '<b>Get started</b>')}</p>`);
  return `<h1>${heading.replace(/\.$/, '')}</h1>${paragraphs.join('')}`;
}

function stageHtml() {
  const steps = STEPS.map(
    (title, i) =>
      `<li><span class="num">${i + 1}</span>` +
      `<span><b>${title}</b><small>${STEP_NOTES[i]}</small></span></li>`,
  ).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>LuchoAI tour</title>
<link rel="stylesheet" href="${appCss}">
<style>
  html, body { margin: 0; overflow: hidden; background: #0f5a2b; }
  body {
    font-family: Inter, 'Inter Fallback', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  #stage {
    position: relative; overflow: hidden; background: #f9fafb;
    width: ${STAGE.width}px; height: ${STAGE.height}px;
  }
  #caption {
    position: absolute; inset: 0 0 auto 0; z-index: 2; box-sizing: border-box;
    height: ${CAPTION_HEIGHT}px; padding: 0 20px;
    display: flex; flex-direction: column; justify-content: center; gap: 7px;
    background: #0f5a2b; color: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.25);
  }
  #caption .fade { transition: opacity .22s ease; }
  #caption.changing .fade { opacity: 0; }
  #kicker {
    display: flex; align-items: center; gap: 8px; color: #fcd34d;
    font-size: 12.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
  }
  #kicker .num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 999px;
    background: #ffb12f; color: #111827; font-size: 13px; letter-spacing: 0;
  }
  #kicker .num:empty { display: none; }
  #text { font-size: 21px; line-height: 1.22; font-weight: 800; }
  #app {
    position: absolute; left: 0; top: ${CAPTION_HEIGHT}px; display: block; border: 0;
    width: ${STAGE.width}px; height: ${STAGE.height - CAPTION_HEIGHT}px; background: #f9fafb;
  }
  #finger {
    position: absolute; left: 0; top: 0; z-index: 5; pointer-events: none; opacity: 0;
    width: 38px; height: 38px; margin: -19px 0 0 -19px;
    transition: transform var(--move, .6s) cubic-bezier(.3,.7,.3,1), opacity .3s;
  }
  #finger.dragging { transition: opacity .3s; }
  #finger .dot {
    position: absolute; inset: 0; border-radius: 50%; transition: transform .15s;
    background: rgba(255,255,255,.55); border: 3px solid #0f5a2b;
    box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 4px 12px rgba(0,0,0,.35);
  }
  #finger.down .dot { transform: scale(.8); }
  #finger .ring {
    position: absolute; inset: 0; border-radius: 50%; border: 4px solid #ffb12f; opacity: 0;
  }
  #finger.tap .ring { animation: ring .55s ease-out; }
  @keyframes ring {
    from { transform: scale(.8); opacity: 1; }
    to { transform: scale(2.2); opacity: 0; }
  }
  .card {
    position: absolute; inset: 0; z-index: 10; box-sizing: border-box; padding: 40px 28px;
    display: flex; flex-direction: column; color: #fff; transition: opacity .6s ease;
    background: linear-gradient(160deg, #0f5a2b 0%, #1a7f3c 100%);
  }
  .card.hidden { opacity: 0; pointer-events: none; }
  .card h1 { margin: 16px 0 8px; font-size: 36px; line-height: 1.08; font-weight: 900; }
  .card p { margin: 0; font-size: 17px; line-height: 1.4; color: #dcfce7; }
  .card ol { list-style: none; margin: 26px 0 0; padding: 0; display: grid; gap: 12px; }
  .card li {
    display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 16px;
    background: rgba(255,255,255,.12);
  }
  .card li .num {
    flex: none; display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 999px;
    background: #ffb12f; color: #111827; font-size: 18px; font-weight: 900;
  }
  .card li b { display: block; font-size: 17px; line-height: 1.25; }
  .card li small { display: block; margin-top: 2px; font-size: 14px; color: #dcfce7; }
  #outro {
    align-items: center; justify-content: center; text-align: center; padding-bottom: 120px;
  }
  #outro p + p { margin-top: 14px; font-size: 15px; }
  #outro b { color: #fcd34d; }
</style></head>
<body>
<div id="stage">
  <div id="caption">
    <div id="kicker" class="fade"><span class="num"></span><span id="kicker-text"></span></div>
    <div id="text" class="fade"></div>
  </div>
  <iframe id="app" name="app" title="LuchoAI"></iframe>
  <div id="finger"><div class="ring"></div><div class="dot"></div></div>
  <div id="intro" class="card">
    <img src="/icons/ball.svg" width="72" height="72" alt="">
    ${cardHtml('intro-1')}
    <ol>${steps}</ol>
  </div>
  <div id="outro" class="card hidden">
    <img src="/icons/trophy.svg" width="88" height="88" alt="">
    ${cardHtml('outro-1')}
  </div>
</div>
<script>
  const el = (id) => document.getElementById(id);
  window.tour = {
    async say(num, kicker, text) {
      el('caption').classList.add('changing');
      await new Promise((r) => setTimeout(r, ${CAPTION_FADE_MS}));
      el('kicker').querySelector('.num').textContent = num ? String(num) : '';
      el('kicker-text').textContent = kicker;
      el('text').textContent = text;
      el('caption').classList.remove('changing');
    },
    point(x, y, seconds) {
      const finger = el('finger');
      finger.style.setProperty('--move', (seconds ?? 0.6) + 's');
      finger.style.opacity = '1';
      finger.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    },
    press(down) { el('finger').classList.toggle('down', down); },
    drag(on) { el('finger').classList.toggle('dragging', on); },
    tap() {
      const finger = el('finger');
      finger.classList.remove('tap');
      void finger.offsetWidth;
      finger.classList.add('tap');
    },
    hideFinger() { el('finger').style.opacity = '0'; },
    card(id, show) { el(id).classList.toggle('hidden', !show); },
  };
</script>
</body></html>`;
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.md': 'text/markdown',
  '.json': 'application/json', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/__tour/') {
    res.writeHead(200, { 'content-type': 'text/html' }).end(stageHtml());
    return;
  }
  const file = [url, `${url}.html`, path.join(url, 'index.html')]
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

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'luchoai-tour-'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({
  viewport: STAGE,
  deviceScaleFactor: SCALE,
  reducedMotion: 'no-preference',
  locale: 'en-AU',
  timezoneId: 'Australia/Sydney',
});
// A fixed after-school moment: the chat times read naturally and every recording gets the same
// week of games. Timers keep running, so the app moves as normal.
await context.clock.setFixedTime(TOUR_TIME);

// Canned AI replies. Anything else off this machine is blocked: the tour must not reach out.
const anthropicReply = (text) => ({
  id: 'msg_tour', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
  content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});
await context.route(/^https?:\/\/(?!localhost)/, async (route) => {
  const request = route.request();
  if (!request.url().startsWith('https://api.anthropic.com/')) return route.abort();
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
  };
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const isPlan = (request.postData() ?? '').includes('1-week football training plan');
  // Long enough to see the coach "typing" and the plan being made.
  await new Promise((r) => setTimeout(r, isPlan ? 1600 : 1500));
  return route.fulfill({
    status: 200,
    headers: { ...cors, 'content-type': 'application/json' },
    body: JSON.stringify(anthropicReply(isPlan ? JSON.stringify(PLAN) : CHAT_REPLY)),
  });
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const app = page.frameLocator('#app');
const hold = (ms) => page.waitForTimeout(ms);

// ── Recording ────────────────────────────────────────────────────────────────
const cdp = await context.newCDPSession(page);
const frames = [];
let recording = false;
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  if (!recording) return;
  const file = path.join(work, `${String(frames.length).padStart(5, '0')}.jpg`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, t: metadata.timestamp ?? Date.now() / 1000 });
});
async function startRecording() {
  recording = true;
  await cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 92, maxWidth: 720, maxHeight: 1280, everyNthFrame: 1,
  });
}
async function stopRecording() {
  const end = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  recording = false;
  return end;
}

// ── Voice and captions ───────────────────────────────────────────────────────
// When each line's recording starts, on the same clock as the frames.
const cues = [];
// When the last line has been spoken and has had its breath.
let quietAt = 0;
let currentStep = { num: 0, title: '' };

// Waits for the last line and its breath, plus `ms` (less, when negative).
async function voiceDone(ms = 0) {
  const wait = (quietAt - Date.now() / 1000) * 1000 + ms;
  if (wait > 0) await hold(wait);
}

// Starts a line's recording now: the soundtrack is laid in from these cues after recording.
async function speak(id) {
  await voiceDone();
  const at = Date.now() / 1000;
  cues.push({ id, at });
  quietAt = at + (RECORDED[id].ms + BREATH_MS) / 1000;
}

// Shows a line in the caption strip. "Step n: <title>." opens a step: the title shows large,
// then the step's other lines show it in the kicker above them.
async function caption(id, kicker) {
  const { text } = LINE[id];
  const title = text.match(STEP_TITLE);
  if (title) currentStep = { num: Number(title[1]), title: title[2] };
  const of = `Step ${currentStep.num} of ${STEPS.length}`;
  let shown = [currentStep.num, `${of} · ${currentStep.title}`, text];
  if (title) shown = [currentStep.num, of, title[2]];
  else if (kicker) shown = [0, kicker, text];
  await page.evaluate(([n, k, t]) => window.tour.say(n, k, t), shown);
}

// The next caption with its voice. The old words fade out during the last line's breath.
async function say(id, kicker) {
  await voiceDone(-CAPTION_FADE_MS);
  await caption(id, kicker);
  await speak(id);
}

// ── Stage helpers ────────────────────────────────────────────────────────────

async function centre(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Not on screen: ${locator}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function point(at, seconds = 0.45) {
  await page.evaluate(([p, s]) => window.tour.point(p.x, p.y, s), [at, seconds]);
  await hold(seconds * 1000 + 80);
}

// Scrolls the app smoothly so the target is in view, as a person would before tapping it.
async function reveal(locator, where = 'center') {
  await locator.waitFor();
  const offscreen = await locator.evaluate((node, top) => {
    // The header stays on screen however far down the page is scrolled.
    if (node.closest('header')) return false;
    const r = node.getBoundingClientRect();
    return r.top < top || r.bottom > window.innerHeight - 8;
  }, APP_HEADER);
  if (!offscreen && where === 'center') return;
  await locator.evaluate((node, [mode, top]) => {
    const r = node.getBoundingClientRect();
    const target = mode === 'top'
      ? window.scrollY + r.top - top - 12
      : window.scrollY + r.top - (window.innerHeight - r.height) / 2;
    window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [where, APP_HEADER]);
  await hold(600);
}

// Lines the bottom of the target up with the bottom of the screen.
async function alignBottom(locator) {
  await locator.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const top = window.scrollY + r.bottom - window.innerHeight + 10;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  });
  await hold(700);
}

async function tap(locator, { pause = 350, move = 0.45, thenHide = false } = {}) {
  await reveal(locator);
  await point(await centre(locator), move);
  await page.evaluate(() => window.tour.tap());
  await locator.click();
  // Hidden when the screen changes under it, so it never seems to point at something else.
  if (thenHide) await page.evaluate(() => window.tour.hideFinger());
  await hold(pause);
}

async function type(locator, text, delay = 70) {
  await tap(locator, { pause: 150 });
  await locator.pressSequentially(text, { delay });
}

async function drag(from, to) {
  await point(from);
  await page.evaluate(() => window.tour.press(true));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.evaluate(() => window.tour.drag(true));
  const moves = 28;
  for (let i = 1; i <= moves; i += 1) {
    const at = {
      x: from.x + ((to.x - from.x) * i) / moves,
      y: from.y + ((to.y - from.y) * i) / moves,
    };
    await page.mouse.move(at.x, at.y);
    await page.evaluate((p) => window.tour.point(p.x, p.y), at);
    await hold(28);
  }
  await hold(700);
  await page.mouse.up();
  await page.evaluate(() => {
    window.tour.press(false);
    window.tour.drag(false);
  });
}

const heading = (name) => app.getByRole('heading', { level: 1, name }).waitFor();
const choice = (text) => app.locator('label', { hasText: text }).first();
const nextButton = () => app.getByRole('button', { name: /^(Next|Finish)$/ });

// On a phone the header's links sit in a full-screen menu behind its three-line button.
async function openFromMenu(name) {
  await tap(app.getByRole('button', { name: 'Menu', exact: true }), { pause: 550 });
  await tap(app.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name, exact: true }));
}

// ── The tour ─────────────────────────────────────────────────────────────────
let failure = null;
try {
  await page.goto(`${base}/__tour/`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    document.getElementById('app').src = '/';
  });
  await app.getByRole('link', { name: 'Get started' }).first().waitFor();
  await hold(800);
  const posterPng = path.join(work, 'poster.png');
  await page.screenshot({ path: posterPng });
  // Ready under the title card, for when it lifts.
  await caption('start-1', 'Start here');

  await startRecording();
  // A moment of quiet first, so the video never opens mid-word.
  await hold(500);
  await speak('intro-1');
  await voiceDone();
  await page.evaluate(() => window.tour.card('intro', false));
  await speak('start-1');
  await hold(1300);
  await tap(app.getByRole('link', { name: 'Get started' }).first());

  // Step 1: the AI key. A step's title is said while its first screen settles.
  await heading('Welcome to LuchoAI');
  if (await app.getByRole('button', { name: 'Try it free' }).count()) {
    throw new Error('this build has the free trial: rebuild without GEMINI_FREE_API_KEY');
  }
  await say('step1-1');
  await say('step1-2');
  await hold(700);
  await tap(app.getByRole('button', { name: /Anthropic/ }), { pause: 600 });
  await say('step1-3');
  await type(app.getByLabel('AI key'), 'sk-ant-tour-video-key', 40);
  await hold(500);
  await tap(app.getByRole('button', { name: 'Start training' }));

  // Step 2: the profile.
  await heading('Who is setting up this profile?');
  await say('step2-1');
  await say('step2-2');
  await hold(700);
  await tap(choice("I'm the player"), { pause: 300 });
  await tap(nextButton());
  await heading('About you');
  await type(app.getByRole('textbox', { name: /first name/ }), 'Mia', 110);
  await tap(choice(/^11$/), { pause: 300 });
  await tap(nextButton());
  await heading('Where do you play most, Mia?');
  await tap(choice('Midfielder'), { pause: 300 });
  await tap(nextButton());
  await heading('How much do you play?');
  await tap(choice('Rising'), { pause: 300 });
  await tap(nextButton());
  await heading('What do you want to work on?');
  await tap(choice('Receiving and turning'), { pause: 250 });
  await tap(choice('First touch'), { pause: 300 });
  await tap(nextButton(), { thenHide: true });
  await heading("You're all set, Mia!");
  await say('step2-3');
  await hold(1500);

  // Step 3: the coach, then a training plan. Each caption changes as the finger sets off, so
  // the words lead the action.
  await say('step3-1');
  await say('step3-2');
  await tap(app.getByRole('link', { name: 'Ask my coach a question' }));
  const message = app.getByRole('textbox', { name: 'Message to your coach' });
  await message.waitFor();
  await hold(500);
  await type(message, 'How can I get a better first touch?', 45);
  await tap(app.getByRole('button', { name: 'Send message' }), { thenHide: true });
  await app.getByText(/Great question, Mia!/).waitFor();
  await say('step3-3');
  await hold(3000);

  await say('step3-4');
  await openFromMenu('Training');
  const generate = app.getByRole('button', { name: 'Generate Plan' });
  await generate.waitFor();
  await hold(500);
  await tap(generate);
  await app.getByRole('button', { name: 'Save this plan' }).waitFor();
  await hold(600);
  await say('step3-5');
  await tap(app.getByRole('button', { name: 'Save this plan' }), { thenHide: true });
  await reveal(app.locator('figure svg[role="img"]').first());
  await hold(2400);

  // Step 4: games, Game IQ and the wellbeing check-in.
  await say('step4-1');
  await say('step4-2');
  await openFromMenu('Games');
  await app.getByRole('heading', { level: 1, name: "This week's games" }).waitFor();
  await hold(2200);
  await say('step4-3');
  await tap(app.getByRole('tab', { name: 'Game IQ' }));
  const theme = /Move into Space.*(situations · Play|· Play again)/;
  await tap(app.getByRole('button', { name: theme }));
  const pitch = app.locator('svg[role="img"]');
  const livePitch = app.locator('[data-live-pitch]');
  await livePitch.waitFor();
  // The question and the drag hint sit in a strip under the pitch: keep that strip on screen.
  await alignBottom(livePitch);
  await app.locator('[data-live-pitch][data-stage="decide"]').waitFor({ timeout: 15000 });
  await alignBottom(livePitch);
  await hold(300);
  // "Move a few steps to the side", the best answer: drop YOU on the spot it stands for.
  const spot = await app.locator('[data-marker="B"]').getAttribute('data-at');
  const [x, y] = spot.split(',').map(Number);
  const box = await pitch.boundingBox();
  await drag(await centre(app.locator('[data-draggable]')), {
    x: box.x + (x / 100) * box.width,
    y: box.y + (y / 75) * box.height,
  });
  const feedback = app.getByRole('status').filter({ hasText: 'Great decision!' });
  await feedback.waitFor();
  await say('step4-4');
  await page.evaluate(() => window.tour.hideFinger());
  await app.locator('[data-live-pitch][data-stage="done"]').waitFor({ timeout: 15000 });
  await hold(1300);
  await alignBottom(feedback);
  await hold(1500);

  await say('step4-5');
  // On a phone Game IQ fills the screen, menu and all: back out to the games first.
  await tap(app.getByRole('button', { name: /All games/ }), { pause: 500 });
  await openFromMenu('Wellbeing');
  await app.getByRole('heading', { name: 'Daily check-in' }).waitFor();
  await reveal(app.getByRole('heading', { name: 'Daily check-in' }), 'top');
  await tap(choice(/^Good$/), { pause: 300 });
  const answers = ['Not really', 'Yes', 'Yes', 'Yes', 'Yes'];
  for (const [i, answer] of answers.entries()) {
    const option = app.locator('[role="radiogroup"]').nth(i).locator(`label[title="${answer}"]`);
    await tap(option, { pause: 100, move: 0.3 });
  }
  await say('step4-6');
  await tap(app.getByRole('button', { name: 'Save check-in' }), { thenHide: true });
  await app.getByText('Balance boosters for you').waitFor();
  await reveal(app.getByText('Balance boosters for you'));
  await hold(2300);

  await page.evaluate(() => window.tour.hideFinger());
  await voiceDone();
  await page.evaluate(() => window.tour.card('outro', true));
  await speak('outro-1');
  // The end card stays up a moment after the last word.
  await voiceDone(600);
  const end = await stopRecording();

  if (errors.length) throw new Error(`page errors during the tour:\n${errors.join('\n')}`);
  if (frames.length < 2) throw new Error('the screencast sent no frames');

  // ── Encode ───────────────────────────────────────────────────────────────
  const list = ['ffconcat version 1.0'];
  frames.forEach((frame, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : end;
    list.push(`file '${frame.file}'`, `duration ${Math.max(next - frame.t, 0.001).toFixed(4)}`);
  });
  // The concat demuxer only honours the last duration when the last file is listed twice.
  list.push(`file '${frames.at(-1).file}'`);
  const listFile = path.join(work, 'frames.txt');
  fs.writeFileSync(listFile, `${list.join('\n')}\n`);

  // The soundtrack: each recording at the moment its caption showed, timed from the first frame.
  const t0 = frames[0].t;
  const soundtrack = new Float32Array(Math.ceil((end - t0) * VOICE_RATE));
  let quietFrom = 0;
  for (const { id, at } of cues) {
    const start = Math.round((at - t0) * VOICE_RATE);
    const clip = decodeClip(clipFile(id));
    if (start < quietFrom) throw new Error(`${id} starts before the line before it has ended`);
    if (start + clip.length > soundtrack.length) throw new Error(`${id} runs past the end`);
    soundtrack.set(clip, start);
    quietFrom = start + clip.length;
  }
  const voiceFile = path.join(work, 'voice.f32');
  fs.writeFileSync(voiceFile, Buffer.from(soundtrack.buffer));

  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  run('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-f', 'f32le', '-ar', String(VOICE_RATE), '-ac', '1', '-i', voiceFile,
    '-map', '0:v', '-map', '1:a',
    '-vf', `fps=${FPS},scale=720:1280:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '27', '-tune', 'animation',
    '-profile:v', 'high', '-level:v', '3.1',
    // One voice in mono: 48 kbit/s keeps it clear and the whole video under 3 MB.
    '-c:a', 'aac', '-b:a', '48k', '-metadata:s:a:0', 'language=eng',
    '-metadata', `comment=${AI_VOICE}`, '-movflags', '+faststart', VIDEO,
  ]);
  const timeline = cues.map(({ id, at }) => ({
    id,
    start: Number((at - t0).toFixed(3)),
    ms: RECORDED[id].ms,
  }));
  fs.writeFileSync(TIMELINE, `${JSON.stringify({ lines: timeline }, null, 2)}\n`);
  run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', posterPng, '-vf', 'scale=720:1280',
    '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6', POSTER,
  ]);
  const seconds = Number(run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', VIDEO,
  ]));
  const kb = (file) => `${Math.round(fs.statSync(file).size / 1024)} KB`;
  console.log(`Recorded ${frames.length} frames.`);
  const clock = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  console.log(`${path.relative(process.cwd(), VIDEO)}: ${seconds.toFixed(1)} s, ${kb(VIDEO)}`);
  console.log(`TOUR_LENGTH in src/components/HowItWorksVideo.tsx should be '${clock}'.`);
  console.log(`${path.relative(process.cwd(), POSTER)}: ${kb(POSTER)}`);
  console.log(`${path.relative(process.cwd(), TIMELINE)}: ${cues.length} lines\n`);
  const sync = spawnSync('node', [path.resolve('e2e/tour-video-sync.mjs')], { stdio: 'inherit' });
  if (sync.status !== 0) throw new Error('the voice and the captions are out of sync (above)');
} catch (e) {
  failure = e;
  fs.mkdirSync(path.dirname(FAILED_SHOT), { recursive: true });
  await page.screenshot({ path: FAILED_SHOT }).catch(() => {});
} finally {
  await browser.close();
  server.close();
  fs.rmSync(work, { recursive: true, force: true });
}
if (failure) fail(`The tour stopped: ${failure.message}\nLast screen: ${FAILED_SHOT}`);
