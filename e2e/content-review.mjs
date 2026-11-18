// Checks the wording fixed in the content review: AI key wording on the set-up screen, the
// Spanish greeting, the breathing instructions and the friendly plan error.
// Needs a build with an empty base path: NODE_ENV=production NEXT_PUBLIC_BASE_PATH= npm run build
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.resolve('out');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = [url, `${url}.html`, path.join(url, 'index.html')]
    .map((c) => path.join(OUT, c))
    .find((f) => f.startsWith(OUT) && fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const VIEWPORTS = [[320, 568], [375, 667], [1280, 800]];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let failed = false;
function check(ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`);
  if (!ok) failed = true;
}

for (const [width, height] of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.route(/^https:\/\/(?!localhost)/, (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `${width}x${height}`;

  await page.goto(`${base}/coach/`);
  await page.getByLabel('AI key').waitFor();
  await page.getByLabel('AI key').fill('not-a-key');
  await page.getByRole('button', { name: 'Start training' }).click();
  const alert = await page.getByText("That key doesn't look right for").textContent();
  check(alert.includes('sk-ant-'), `${tag} bad key gets a friendly message`);
  check(await page.getByText('only ever sent to the AI company you choose').isVisible(),
    `${tag} key privacy line is honest`);
  await page.screenshot({ path: `e2e/screenshots/content-key-${tag}.png` });

  await page.evaluate(() => {
    localStorage.setItem('luchoai_provider_config',
      JSON.stringify({ provider: 'anthropic', model: 'claude-opus-4-8', apiKey: 'sk-ant-test' }));
  });
  await page.goto(`${base}/coach/`);
  check(await page.getByText(/^¡Hola! I'm LuchoAI/).isVisible(), `${tag} coach greets with ¡Hola!`);

  await page.goto(`${base}/wellbeing/`);
  check(await page.getByText(/for 4 seconds, then out through your mouth for 6 seconds/).isVisible(),
    `${tag} breathing times say seconds`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check(!overflow, `${tag} no horizontal scroll`);
  check(errors.length === 0, `${tag} no page errors ${errors.join('; ')}`);
  await page.screenshot({ path: `e2e/screenshots/content-wellbeing-${tag}.png` });
  await context.close();
}
await browser.close();
server.close();
if (failed) process.exit(1);
console.log('All content review checks passed');
