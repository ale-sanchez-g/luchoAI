// WCAG 2.1 AA check of the built site in a real browser, using axe-core.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/wcag-aa.mjs
//
// Runs axe's WCAG 2.0 and 2.1 level A and AA rules on every page, for a first-time visitor and a
// returning player, and on the screens behind a few taps (a coach reply, a training plan, a Game
// IQ "when" situation with its GO! button, a low-mood check-in, the phone menu opened from the
// header), at 320x568, 375x667 and 1280x800. The AI is mocked: nothing leaves the machine.
//
// axe cannot judge text on a gradient or a picture (the hero and its pitch markings) or a lone
// symbol such as → or ▾, so this script measures those itself: it screenshots the text, then
// again with every letter on the page hidden, and checks the text colour against each pixel under
// and right beside its letters.
// Floors (WCAG 2.1, 1.4.3 and 1.4.11): 4.5:1 for text, 3:1 for large text (24px, or 18.66px
// bold) and for symbols.
//
// Results axe leaves for a person to review are printed, not failed, apart from "bypass": a page
// with nothing to jump to past the header (no <main>, heading or skip link) fails 2.4.1.
//
// Fails on anything not in KNOWN_GAPS, and on a known gap that no longer shows, so the list stays
// true. Each failing screen is saved to e2e/screenshots (gitignored).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Problems already in the app when a check first finds them (say, after an axe-core upgrade),
// listed so they cannot spread unnoticed while they wait for a fix. Each names its colours
// (`text`, and `on`, or 'pixels' when measured against what is behind the text), what it `says`
// and the `pages` it shows on, or else the axe `rule`; `where` says where and the lowest ratio
// seen. Fix one, then delete its entry: the check fails until you do. Never list something new.
// Empty since issue #42 fixed the nine this check found when it was added.
const KNOWN_GAPS = [];

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

const ROUTES = ['/', '/coach/', '/training/', '/games/', '/wellbeing/', '/profile/', '/privacy/'];
const NOT_FOUND = '/no-such-page/';

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

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const LOW_MOOD_CHECK_IN = {
  date: today(),
  mood: 1,
  balance: { sleep: 1, football: 2, school: 2, people: 2, fun: 1 },
  proudOf: '',
};

const COACH_REPLY =
  'Great question! Try wall passes: 50 with your right foot, 50 with your left.\n\n' +
  'Cushion the ball by letting your foot move back as it arrives.';

const PLAN = {
  weeklyGoal: 'A sharper first touch',
  sessions: [1, 2, 3].map((n) => ({
    id: `session-${n}`,
    title: `Session ${n}`,
    duration: 30,
    focus: 'First touch',
    notes: 'Have fun and stay relaxed.',
    drills: [
      {
        name: 'Wall passes',
        duration: 10,
        description: 'Pass against a wall and control the ball as it comes back.',
        coachingPoints: ['Head up', 'Soft touch'],
        setup: 'wall',
      },
    ],
  })),
};

function anthropicReply(text) {
  return {
    status: 200,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    body: JSON.stringify({
      id: 'msg_e2e',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-8',
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  };
}

// Every letter on the page, hidden, so a screenshot shows only what is behind the text.
const HIDE_LETTERS =
  '*, *::before, *::after { color: transparent !important; ' +
  '-webkit-text-fill-color: transparent !important; ' +
  'text-decoration-color: transparent !important; text-shadow: none !important; ' +
  'caret-color: transparent !important; } ' +
  'text, tspan { fill: transparent !important; stroke: transparent !important; }';

// Colour transitions would let a screenshot or a colour reading catch text halfway through a fade.
const NO_TRANSITIONS = '*, *::before, *::after { transition: none !important; }';

function toHex(cssColor) {
  const [r, g, b] = cssColor.match(/[\d.]+/g).map(Number);
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function contrast(a, b) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (css) => {
    const [r, g, bl] = css.match(/[\d.]+/g).map(Number);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(bl);
  };
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Runs in the decoder page. Each shot comes twice, with the text and with every letter hidden;
 * where they differ is where the letters are. Returns the worst WCAG contrast between `color` and
 * the pixels under and right beside the letters.
 */
async function worstContrast({ shots, color }) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (r, g, b) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const [fr, fg, fb, fa = 1] = color.match(/[\d.]+/g).map(Number);
  const pixels = async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, px: ctx.getImageData(0, 0, img.width, img.height).data };
  };
  let worst = Infinity;
  for (const shot of shots) {
    const shown = await pixels(shot.shown);
    const { w, h, px } = await pixels(shot.hidden);
    const letter = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i += 1) {
      const d =
        Math.abs(shown.px[i * 4] - px[i * 4]) +
        Math.abs(shown.px[i * 4 + 1] - px[i * 4 + 1]) +
        Math.abs(shown.px[i * 4 + 2] - px[i * 4 + 2]);
      letter[i] = d > 30 ? 1 : 0;
    }
    // One pixel round each letter too: the edge is where text meets its background.
    const near = (i) => {
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && letter[ny * w + nx]) return true;
        }
      }
      return false;
    };
    // Text the same colour as its background leaves no trace: judge it on the whole area.
    const any = letter.some((v) => v === 1);
    for (let i = 0; i < w * h; i += 1) {
      if (any && !near(i)) continue;
      const r = px[i * 4];
      const g = px[i * 4 + 1];
      const b = px[i * 4 + 2];
      // Semi-transparent text is drawn over the pixel behind it.
      const mix = (t, under) => t * fa + under * (1 - fa);
      const text = luminance(mix(fr, r), mix(fg, g), mix(fb, b));
      const back = luminance(r, g, b);
      const ratio = (Math.max(text, back) + 0.05) / (Math.min(text, back) + 0.05);
      if (ratio < worst) worst = ratio;
    }
  }
  return worst;
}

/**
 * Runs in the page: what one element's own text looks like now. SVG text drawn with a halo (a
 * stroke painted under its fill) reads against that halo. Text under something opaque, such as
 * the page beneath Game IQ's full-screen view on a phone, is not on show.
 */
function textInfo(selector) {
  const e = document.querySelector(selector);
  if (!e) return null;
  e.scrollIntoView({ block: 'center', inline: 'center' });
  const style = getComputedStyle(e);
  const svg = e instanceof SVGElement;
  const rects = [];
  if (svg) {
    const r = e.getBoundingClientRect();
    rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
  } else {
    for (const node of e.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
      }
    }
  }
  const hiddenAt = (x, y) => {
    for (const top of document.elementsFromPoint(x, y)) {
      if (top === e || e.contains(top) || top.contains(e)) return false;
      const s = getComputedStyle(top);
      const alpha = Number((s.backgroundColor.match(/[\d.]+/g) ?? [])[3] ?? 1);
      if (alpha >= 0.9 || s.backgroundImage !== 'none') return true;
    }
    return false;
  };
  const halo =
    svg &&
    style.stroke !== 'none' &&
    parseFloat(style.strokeWidth) > 0 &&
    style.paintOrder.startsWith('stroke')
      ? style.stroke
      : null;
  // SVG font sizes are in the drawing's own units; scale them to screen pixels.
  const scale = svg ? (e.getScreenCTM()?.a ?? 1) : 1;
  return {
    color: svg ? style.fill : style.color,
    halo,
    onShow: rects.some((r) => !hiddenAt(r.x + r.width / 2, r.y + r.height / 2)),
    fontSize: parseFloat(style.fontSize) * scale,
    fontWeight: Number(style.fontWeight) || 400,
    text: e.textContent.trim().replace(/\s+/g, ' '),
    rects,
  };
}

/** Measures one element's text against what is behind it; null when it is not on show. */
async function measure(page, decoder, selector, viewport) {
  const info = await page.evaluate(textInfo, selector);
  if (!info?.onShow) return null;
  if (info.halo) return { ...info, ratio: contrast(info.color, info.halo) };
  const clips = info.rects
    .map((r) => {
      const x = Math.max(0, Math.floor(r.x));
      const y = Math.max(0, Math.floor(r.y));
      const right = Math.min(viewport.width, Math.ceil(r.x + r.width));
      const bottom = Math.min(viewport.height, Math.ceil(r.y + r.height));
      return { x, y, width: right - x, height: bottom - y };
    })
    .filter((c) => c.width > 0 && c.height > 0);
  if (clips.length === 0) return null;
  const shown = [];
  for (const clip of clips) shown.push((await page.screenshot({ clip })).toString('base64'));
  const hide = await page.addStyleTag({ content: HIDE_LETTERS });
  const shots = [];
  for (const [i, clip] of clips.entries()) {
    shots.push({ shown: shown[i], hidden: (await page.screenshot({ clip })).toString('base64') });
  }
  await hide.evaluate((s) => s.remove());
  const ratio = await decoder.evaluate(worstContrast, { shots, color: info.color });
  return { ...info, ratio };
}

function floorFor({ fontSize, fontWeight, text }) {
  // A lone symbol (→, ▾) is an icon: 1.4.11 asks 3:1. Large text: 1.4.3 asks 3:1.
  if (!/[\p{L}\p{N}]/u.test(text)) return 3;
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
}

const failures = [];
const seenGaps = new Set();
const review = new Map();
let audits = 0;
let measured = 0;

function isKnown(finding) {
  const index = KNOWN_GAPS.findIndex(
    (gap) =>
      (gap.rule ?? 'color-contrast') === finding.rule &&
      gap.pages.includes(finding.path) &&
      (finding.rule !== 'color-contrast' ||
        (gap.text === finding.fg && gap.on === finding.on && gap.says.test(finding.says))),
  );
  if (index >= 0) seenGaps.add(index);
  return index >= 0;
}

/** Runs axe on what the page shows now and records anything below WCAG 2.1 AA. */
async function audit(page, decoder, label, pagePath, viewport) {
  audits += 1;
  const still = await page.addStyleTag({ content: NO_TRANSITIONS });
  if (!(await page.evaluate(() => Boolean(window.axe)))) {
    await page.addScriptTag({ content: AXE_SOURCE });
  }
  const results = await page.evaluate(
    (tags) =>
      window.axe.run(document, {
        runOnly: { type: 'tag', values: tags },
        resultTypes: ['violations', 'incomplete'],
      }),
    WCAG_21_AA,
  );
  const problems = [];
  for (const rule of results.violations) {
    for (const node of rule.nodes) {
      const selector = node.target[0];
      const data = node.any[0]?.data;
      if (rule.id === 'color-contrast' && data?.fgColor && data?.bgColor) {
        const info = typeof selector === 'string' ? await page.evaluate(textInfo, selector) : null;
        if (info && !info.onShow) continue;
        const finding = {
          rule: rule.id,
          path: pagePath,
          fg: data.fgColor,
          on: data.bgColor,
          says: info?.text ?? '',
        };
        if (isKnown(finding)) continue;
        problems.push(
          `${data.fgColor} on ${data.bgColor} is ${data.contrastRatio}:1, needs ` +
            `${data.expectedContrastRatio} (${node.target.join(' ')})`,
        );
      } else {
        if (isKnown({ rule: rule.id, path: pagePath })) continue;
        problems.push(`${rule.id}: ${rule.help} (${node.target.join(' ')})`);
      }
    }
  }
  for (const rule of results.incomplete) {
    // axe only asks a person to review "bypass" (2.4.1, level A) when it finds no skip link,
    // heading or <main> to jump to past the header. Every page here gives one, so that fails.
    if (rule.id === 'bypass') {
      if (!isKnown({ rule: rule.id, path: pagePath })) {
        problems.push(`bypass: ${rule.help}: no <main> landmark, heading or skip link`);
      }
      continue;
    }
    if (rule.id !== 'color-contrast') {
      const key = `${pagePath} ${rule.id}`;
      if (!review.has(key)) review.set(key, `${rule.help} (${rule.nodes[0].target.join(' ')})`);
      continue;
    }
    for (const node of rule.nodes) {
      const selector = node.target[0];
      if (typeof selector !== 'string') continue;
      const result = await measure(page, decoder, selector, viewport);
      if (!result) continue;
      measured += 1;
      const floor = floorFor(result);
      if (result.ratio >= floor) continue;
      const finding = {
        rule: rule.id,
        path: pagePath,
        fg: toHex(result.color),
        on: result.halo ? toHex(result.halo) : 'pixels',
        says: result.text,
      };
      if (isKnown(finding)) continue;
      const against = result.halo ? `its ${finding.on} outline` : 'the pixels behind it';
      problems.push(
        `${finding.fg} "${result.text.slice(0, 40)}" is ${result.ratio.toFixed(2)}:1 against ` +
          `${against}, needs ${floor}:1 (${selector})`,
      );
    }
  }
  await still.evaluate((s) => s.remove());
  if (problems.length) {
    failures.push(`${label}: ${problems.join('; ')}`);
    console.log(`FAIL ${label}\n  - ${problems.join('\n  - ')}`);
    const file = `wcag-${label.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.png`;
    await page.screenshot({ path: path.join(SHOTS, file), fullPage: true });
  } else {
    console.log(`PASS ${label}`);
  }
}

async function newPlayerContext(browser, viewport, seed) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  // A page load must never reach a real AI provider; the screens below mock their replies.
  await context.route(/^https:\/\/(?!localhost)/, (route) => route.abort());
  if (seed) {
    await context.addInitScript((items) => {
      for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
    }, seed);
  }
  return context;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const vp of VIEWPORTS) {
  for (const visitor of ['first-visit', 'returning']) {
    console.log(`\n== ${visitor} / ${vp.name} ==`);
    const context = await newPlayerContext(
      browser,
      vp,
      visitor === 'returning' ? RETURNING_PLAYER : null,
    );
    const decoder = await context.newPage();
    const page = await context.newPage();
    for (const route of [...ROUTES, NOT_FOUND]) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      await audit(page, decoder, `${visitor} ${vp.name} ${route}`, route, vp);
    }
    await context.close();
  }

  console.log(`\n== screens behind a tap / ${vp.name} ==`);
  {
    const context = await newPlayerContext(browser, vp, RETURNING_PLAYER);
    const decoder = await context.newPage();
    const page = await context.newPage();
    await page.route('https://api.anthropic.com/**', (route) =>
      route.fulfill(anthropicReply(COACH_REPLY)),
    );
    await page.goto(`${base}/coach/`, { waitUntil: 'networkidle' });
    await page
      .getByRole('textbox', { name: 'Message to your coach' })
      .fill('How do I get a better first touch?');
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.getByText('Cushion the ball').waitFor();
    await audit(page, decoder, `coach reply ${vp.name}`, '/coach/', vp);
    await context.close();
  }
  {
    const context = await newPlayerContext(browser, vp, RETURNING_PLAYER);
    const decoder = await context.newPage();
    const page = await context.newPage();
    await page.route('https://api.anthropic.com/**', (route) =>
      route.fulfill(anthropicReply(JSON.stringify(PLAN))),
    );
    await page.goto(`${base}/training/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Generate Plan|Regenerate/ }).click();
    await page.getByRole('button', { name: 'Save this plan' }).waitFor();
    await audit(page, decoder, `training plan ${vp.name}`, '/training/', vp);
    await context.close();
  }
  {
    const context = await newPlayerContext(browser, vp, RETURNING_PLAYER);
    const decoder = await context.newPage();
    const page = await context.newPage();
    await page.goto(`${base}/games/`, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Game IQ' }).click();
    await page
      .getByRole('button', { name: /Move into Space.*(situations · Play|· Play again)/ })
      .click();
    await page.getByRole('button', { name: /^A\. / }).waitFor();
    await audit(page, decoder, `game iq situation ${vp.name}`, '/games/', vp);
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: /^A\. / }).click();
      await page.getByRole('button', { name: /Next situation|See my score/ }).click();
    }
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'GO!' }).waitFor();
    await audit(page, decoder, `game iq GO! button ${vp.name}`, '/games/', vp);
    await page.getByRole('button', { name: 'GO!' }).click();
    await page.getByRole('status').waitFor();
    await audit(page, decoder, `game iq feedback ${vp.name}`, '/games/', vp);
    await context.close();
  }
  {
    const context = await newPlayerContext(browser, vp, {
      ...RETURNING_PLAYER,
      luchoai_wellbeing_checkins: JSON.stringify([LOW_MOOD_CHECK_IN]),
    });
    const decoder = await context.newPage();
    const page = await context.newPage();
    await page.goto(`${base}/wellbeing/`, { waitUntil: 'networkidle' });
    await page.getByText('It sounds like things are tough right now.').waitFor();
    await audit(page, decoder, `wellbeing support ${vp.name}`, '/wellbeing/', vp);
    await context.close();
  }
  // Below 768px the header's links live in a full-screen menu behind the three-line button.
  if (vp.width < 768) {
    const context = await newPlayerContext(browser, vp, RETURNING_PLAYER);
    const decoder = await context.newPage();
    const page = await context.newPage();
    await page.goto(`${base}/wellbeing/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('dialog', { name: 'Menu' }).waitFor();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await audit(page, decoder, `header menu open ${vp.name}`, '/wellbeing/', vp);
    await context.close();
  }
}

await browser.close();
server.close();

KNOWN_GAPS.forEach((gap, index) => {
  if (seenGaps.has(index)) return;
  failures.push(`known gap no longer shows: ${gap.where}`);
  console.log(`\nFAIL known gap no longer shows (fixed? delete it from KNOWN_GAPS): ${gap.where}`);
});

console.log(`\n${audits} screens checked, ${measured} texts measured against what is behind them`);
if (review.size) {
  console.log('\naxe could not decide these; a person should look (they do not fail the run):');
  for (const [key, text] of review) console.log(`- ${key}: ${text}`);
}
if (KNOWN_GAPS.length) {
  console.log(`\nKnown gaps still open (${KNOWN_GAPS.length}):`);
  for (const gap of KNOWN_GAPS) console.log(`- ${gap.where}`);
}
if (failures.length) {
  console.log(`\n${failures.length} problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
const apart = KNOWN_GAPS.length ? ', apart from the known gaps listed above' : '';
console.log(`\nAll screens meet WCAG 2.1 AA${apart}`);
