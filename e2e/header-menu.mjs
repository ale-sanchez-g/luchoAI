// The responsive header in a real browser: on phones a three-line button opens a full-screen
// menu; from 768px wide the links sit in the bar.
// Usage: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build && node e2e/header-menu.mjs
// Checks every page at phone, tablet and desktop sizes (sizes, what is on show, no sideways
// scroll), then the menu itself: it covers the screen, marks the page you are on, keeps keyboard
// focus inside, stops the page behind from scrolling, closes with its X, Escape and a link, and
// closes when a tablet turns wide. Screenshots land in e2e/screenshots (gitignored).
// Exits non-zero on any failed step.
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
  { path: '/', current: 'Home' },
  { path: '/coach/', current: 'Coach' },
  { path: '/training/', current: 'Training' },
  { path: '/games/', current: 'Games' },
  { path: '/wellbeing/', current: 'Wellbeing' },
  { path: '/profile/', current: 'Profile' },
  { path: '/privacy/', current: null },
];
const PAGES = ['Home', 'Coach', 'Training', 'Games', 'Wellbeing', 'Profile'];

const PHONES = [
  { name: 'small-320', width: 320, height: 568 },
  { name: 'phone-375', width: 375, height: 667 },
];
const WIDE = [
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

// Returning players see the header on every page; first-run set-up screens have none.
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

async function open(viewport, route, options = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: options.reducedMotion ?? 'no-preference',
  });
  // Nothing in the header may reach another site.
  await context.route(/^https:\/\/(?!localhost)/, (r) => r.abort());
  await context.addInitScript((items) => {
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
  }, RETURNING_PLAYER);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  return { context, page, errors };
}

const menuButton = (page) => page.getByRole('button', { name: 'Menu', exact: true });
const menu = (page) => page.getByRole('dialog', { name: 'Menu' });

async function openMenu(page) {
  await menuButton(page).click();
  await menu(page).waitFor();
  // Let the fade finish, so a screenshot or a colour reading sees the menu as it stays.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

const pageState = (page) =>
  page.evaluate(() => ({
    sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    menuOpen: document.querySelector('header dialog')?.open ?? null,
    pageOverflow: getComputedStyle(document.documentElement).overflowY,
  }));

for (const vp of [...PHONES, ...WIDE]) {
  const phone = PHONES.includes(vp);
  console.log(`\n== every page / ${vp.name} ==`);
  const { context, page, errors } = await open(vp, '/');
  for (const route of ROUTES) {
    await step(`${route.path} header at ${vp.name}`, async () => {
      await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' });
      const header = await page.locator('header').boundingBox();
      assert(Math.round(header.height) === 56, `header is ${header.height}px tall`);
      const brand = page.getByRole('link', { name: 'LuchoAI home' });
      assert(await brand.isVisible(), 'the LuchoAI name and logo are not on show');
      const bar = page.locator('header').getByRole('navigation', { name: 'Main' });
      if (phone) {
        const box = await menuButton(page).boundingBox();
        assert(box && box.width >= 44 && box.height >= 44, `menu button is ${box?.width}px`);
        assert(box.x + box.width <= vp.width, 'menu button runs off the screen');
        assert(!(await bar.isVisible()), 'the bar links show beside the menu button');
      } else {
        assert(!(await menuButton(page).isVisible()), 'the menu button shows on a wide screen');
        const links = bar.getByRole('link');
        const names = await links.allTextContents();
        assert(names.join() === PAGES.join(), `bar links are ${names.join()}`);
        for (const link of await links.all()) {
          const box = await link.boundingBox();
          assert(box.height >= 44, `${await link.textContent()} is ${box.height}px tall`);
          assert(box.x + box.width <= vp.width, `${await link.textContent()} runs off screen`);
        }
        const current = await bar.locator('[aria-current="page"]').allTextContents();
        assert(
          current.join() === (route.current ?? ''),
          `marked as current: "${current.join()}", expected "${route.current ?? ''}"`,
        );
      }
      const state = await pageState(page);
      assert(state.sideways <= 0, `sideways scroll of ${state.sideways}px`);
      if (route.path === '/wellbeing/' || route.path === '/coach/') {
        const name = route.path.replace(/\W/g, '');
        await page.screenshot({ path: path.join(SHOTS, `header-${vp.name}-${name}.png`) });
      }
    });
  }
  await step(`no page errors at ${vp.name}`, async () => {
    assert(errors.length === 0, errors.join('; '));
  });
  await context.close();
}

for (const vp of PHONES) {
  console.log(`\n== the menu / ${vp.name} ==`);

  await step(`menu covers the screen and marks the page you are on (${vp.name})`, async () => {
    const { context, page, errors } = await open(vp, '/wellbeing/');
    const buttonBox = await menuButton(page).boundingBox();
    await openMenu(page);
    assert(
      (await menuButton(page).getAttribute('aria-expanded')) === 'true',
      'menu button does not say the menu is open',
    );
    const box = await menu(page).boundingBox();
    assert(
      box.x === 0 && box.y === 0 && box.width === vp.width && box.height === vp.height,
      `menu is ${box.width}x${box.height} at ${box.x},${box.y}`,
    );
    const close = await page.getByRole('button', { name: 'Close menu' }).boundingBox();
    assert(
      Math.abs(close.x - buttonBox.x) <= 1 && Math.abs(close.y - buttonBox.y) <= 1,
      `the X is at ${close.x},${close.y}, the menu button was at ${buttonBox.x},${buttonBox.y}`,
    );
    const links = menu(page).getByRole('link');
    assert((await links.allTextContents()).join() === PAGES.join(), 'menu links are not in order');
    for (const link of await links.all()) {
      const r = await link.boundingBox();
      assert(r.height >= 48, `${await link.textContent()} is ${r.height}px tall`);
      assert(r.y + r.height <= vp.height, `${await link.textContent()} is below the screen`);
    }
    const current = await menu(page).locator('[aria-current="page"]').allTextContents();
    assert(current.join() === 'Wellbeing', `marked as current: ${current.join()}`);
    const inside = await page.evaluate(() =>
      document.querySelector('header dialog').contains(document.activeElement),
    );
    assert(inside, 'focus did not move into the menu');
    const state = await pageState(page);
    assert(state.sideways <= 0, `sideways scroll of ${state.sideways}px`);
    await page.screenshot({ path: path.join(SHOTS, `header-${vp.name}-menu-open.png`) });
    assert(errors.length === 0, errors.join('; '));
    await context.close();
  });

  await step(`the page under the menu stays still (${vp.name})`, async () => {
    const { context, page } = await open(vp, '/wellbeing/');
    await openMenu(page);
    assert((await pageState(page)).pageOverflow === 'hidden', 'the page can still scroll');
    await page.mouse.move(vp.width / 2, vp.height - 40);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    const scrolled = await page.evaluate(() => window.scrollY);
    assert(scrolled === 0, `the page behind scrolled ${scrolled}px`);
    await page.getByRole('button', { name: 'Close menu' }).click();
    const after = await pageState(page);
    assert(after.menuOpen === false, 'the X did not close the menu');
    assert(after.pageOverflow !== 'hidden', 'the page cannot scroll after the menu closed');
    await page.mouse.wheel(0, 600);
    await page.waitForFunction(() => window.scrollY > 0);
    await context.close();
  });

  await step(`keyboard: focus stays in the menu, Escape closes it (${vp.name})`, async () => {
    const { context, page } = await open(vp, '/games/');
    await menuButton(page).focus();
    await page.keyboard.press('Enter');
    await menu(page).waitFor();
    const behind = [];
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const el = document.activeElement;
        if (el === document.body || document.querySelector('header dialog').contains(el)) {
          return null;
        }
        return el.outerHTML.slice(0, 80);
      });
      if (where) behind.push(where);
    }
    assert(behind.length === 0, `focus reached the page behind the menu: ${behind[0]}`);
    await page.keyboard.press('Escape');
    const state = await pageState(page);
    assert(state.menuOpen === false, 'Escape did not close the menu');
    const back = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,
    );
    assert(back === 'Menu', `focus went to ${back}, not back to the menu button`);
    // React re-renders just after the dialog's close event, so give it a moment.
    await page.waitForFunction(
      () => document.querySelector('header button[aria-haspopup]').ariaExpanded === 'false',
      null,
      { timeout: 2000 },
    );
    await context.close();
  });

  await step(`a link in the menu opens its page without a reload (${vp.name})`, async () => {
    const { context, page, errors } = await open(vp, '/');
    await page.evaluate(() => {
      window.__sameDocument = true;
    });
    for (const [name, target] of [['Games', '/games/'], ['Coach', '/coach/'], ['Home', '/']]) {
      await openMenu(page);
      await menu(page).getByRole('link', { name, exact: true }).click();
      await page.waitForURL(`${base}${target}`);
      await page.waitForLoadState('networkidle');
      const same = await page.evaluate(() => window.__sameDocument === true);
      assert(same, `opening ${target} reloaded the whole page`);
      const state = await pageState(page);
      assert(state.menuOpen === false, `the menu is still open on ${target}`);
      assert(state.pageOverflow !== 'hidden', `${target} cannot scroll`);
    }
    // The page you are on navigates nowhere, so the menu has to close by itself.
    await openMenu(page);
    await menu(page).getByRole('link', { name: 'Home', exact: true }).click();
    await page.waitForTimeout(300);
    assert((await pageState(page)).menuOpen === false, 'tapping the current page left it open');
    await page.reload({ waitUntil: 'networkidle' });
    assert((await pageState(page)).menuOpen === false, 'the menu is open after a reload');
    assert(errors.length === 0, errors.join('; '));
    await context.close();
  });

  await step(`coach chat keeps one screen with the menu closed again (${vp.name})`, async () => {
    const { context, page } = await open(vp, '/coach/');
    await openMenu(page);
    await page.screenshot({ path: path.join(SHOTS, `header-${vp.name}-coach-menu-open.png`) });
    await page.getByRole('button', { name: 'Close menu' }).click();
    const box = await page.getByRole('textbox', { name: 'Message to your coach' }).boundingBox();
    assert(box && box.y + box.height <= vp.height, 'the message box is off the screen');
    await context.close();
  });
}

await step('a phone turned sideways can still reach every link in the menu', async () => {
  const { context, page } = await open({ width: 568, height: 320 }, '/wellbeing/');
  await openMenu(page);
  const last = menu(page).getByRole('link', { name: 'Profile' });
  await last.scrollIntoViewIfNeeded();
  const box = await last.boundingBox();
  assert(box.y >= 0 && box.y + box.height <= 320, `Profile is at ${box.y}, out of reach`);
  assert((await page.evaluate(() => window.scrollY)) === 0, 'the page behind scrolled');
  const close = await page.getByRole('button', { name: 'Close menu' }).boundingBox();
  assert(close.y >= 0 && close.y < 56, `the X scrolled away (at ${close.y})`);
  await page.screenshot({ path: path.join(SHOTS, 'header-landscape-menu-open.png') });
  // Back up the list by keyboard: no link may hide under the pinned row with the X.
  await last.focus();
  for (let i = 0; i < PAGES.length - 1; i += 1) {
    await page.keyboard.press('Shift+Tab');
    const top = await page.evaluate(() => document.activeElement.getBoundingClientRect().top);
    const name = await page.evaluate(() => document.activeElement.textContent);
    assert(top >= 56 - 1, `${name} is under the row with the X (top ${top})`);
  }
  await context.close();
});

await step('the menu closes when a tablet turns wide enough for the bar links', async () => {
  const { context, page } = await open({ width: 744, height: 1133 }, '/games/');
  await openMenu(page);
  await page.setViewportSize({ width: 1133, height: 744 });
  await page.waitForFunction(() => document.querySelector('header dialog').open === false);
  const state = await pageState(page);
  assert(state.pageOverflow !== 'hidden', 'the page cannot scroll after the menu closed');
  const bar = page.locator('header').getByRole('navigation', { name: 'Main' });
  assert(await bar.isVisible(), 'the bar links did not appear');
  await context.close();
});

await step('with reduced motion the menu appears without a fade', async () => {
  const { context, page } = await open(PHONES[1], '/', { reducedMotion: 'reduce' });
  await menuButton(page).click();
  await menu(page).waitFor();
  const fades = await page.evaluate(
    () => document.querySelector('header dialog').getAnimations().length,
  );
  assert(fades === 0, `${fades} animation(s) ran`);
  await context.close();
});

await browser.close();
server.close();

if (failures.length) {
  console.log(`\n${failures.length} step(s) failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAll header and menu steps passed');
