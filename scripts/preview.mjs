// Builds the site the way the deploy workflow does and serves it at the same paths as GitHub
// Pages (http://localhost:4173/luchoAI/), so a change can be clicked through before it goes live.
// `next start` cannot serve a static export, and `npx serve out` ignores the /luchoAI base path.
//
// Usage: npm run preview [-- --no-build] [-- --port 5000] [-- --host]
//   --no-build  serve the existing out/ folder (it must have been built with /luchoAI)
//   --host      listen on every network, so a phone on the same Wi-Fi can open it
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const BASE = '/luchoAI';
const OUT = path.resolve('out');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const portArg = args.indexOf('--port');
const PORT = portArg === -1 ? 4173 : Number(args[portArg + 1]);
const HOST = flag('--host') ? '0.0.0.0' : '127.0.0.1';

if (!flag('--no-build')) {
  const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const env = { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_BASE_PATH: BASE };
  const build = spawnSync(process.execPath, [next, 'build'], { stdio: 'inherit', env });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const home = path.join(OUT, 'index.html');
if (!fs.existsSync(home) || !fs.readFileSync(home, 'utf8').includes(`${BASE}/_next/`)) {
  console.error(`out/ was not built for ${BASE}. Run "npm run preview" without --no-build.`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

// Parses a single "bytes=start-end" range, or returns null for anything else.
function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!match || (match[1] === '' && match[2] === '')) return null;
  if (match[1] === '') return { start: Math.max(0, size - Number(match[2])), end: size - 1 };
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  return { start: Number(match[1]), end };
}

function send(res, status, file, rangeHeader) {
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  const size = fs.statSync(file).size;
  // Never cache, so a fresh build shows on the next reload.
  const headers = { 'content-type': type, 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
  // Safari only plays a video from a server that answers byte ranges, as GitHub Pages does.
  const range = status === 200 ? byteRange(rangeHeader, size) : null;
  if (range && (range.start > range.end || range.start >= size)) {
    res.writeHead(416, { 'content-range': `bytes */${size}` }).end();
    return;
  }
  if (range) {
    res.writeHead(206, {
      ...headers,
      'content-range': `bytes ${range.start}-${range.end}/${size}`,
      'content-length': range.end - range.start + 1,
    });
    fs.createReadStream(file, range).pipe(res);
    return;
  }
  res.writeHead(status, { ...headers, 'content-length': size });
  fs.createReadStream(file).pipe(res);
}

function redirect(res, location) {
  res.writeHead(301, { location }).end();
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/' || pathname === BASE) return redirect(res, `${BASE}/`);
  const notFound = () => send(res, 404, path.join(OUT, '404.html'));
  if (!pathname.startsWith(`${BASE}/`)) return notFound();

  let file;
  try {
    file = path.join(OUT, decodeURIComponent(pathname.slice(BASE.length)));
  } catch {
    return notFound();
  }
  if (file !== OUT && !file.startsWith(OUT + path.sep)) return notFound();
  const stat = fs.existsSync(file) ? fs.statSync(file) : null;
  // Like GitHub Pages: a folder without its trailing slash redirects, a folder serves index.html.
  if (stat?.isDirectory() && !pathname.endsWith('/')) return redirect(res, `${pathname}/`);
  const target = stat?.isDirectory() ? path.join(file, 'index.html') : file;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return notFound();
  return send(res, 200, target, req.headers.range);
});

server.listen(PORT, HOST, () => {
  console.log('\nLuchoAI preview: the production build, on this computer only (nothing deployed)');
  console.log(`  This computer: http://localhost:${PORT}${BASE}/`);
  if (HOST === '0.0.0.0') {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((a) => a && a.family === 'IPv4' && !a.internal);
    for (const a of lan) console.log(`  Same Wi-Fi:    http://${a.address}:${PORT}${BASE}/`);
  } else {
    console.log('  To open it on your phone (same Wi-Fi), run: npm run preview -- --host');
  }
  console.log('Press Ctrl+C to stop.');
});
