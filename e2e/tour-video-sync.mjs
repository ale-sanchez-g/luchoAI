// Proves the home page tour's voice-over and captions are in sync, measured from the MP4 itself.
// Usage: node e2e/tour-video-sync.mjs (needs ffmpeg). scripts/how-it-works-video.mjs runs it
// after every recording.
//
// scripts/tour-voice/timeline.json says when each line starts. In the video this checks that:
// - every line of scripts/tour-voice/lines.json is in the timeline once, in order, and none
//   starts before the one before it has ended or ends after the video does;
// - the soundtrack is one AAC voice track, labelled as AI-generated;
// - each line's speech starts where the timeline says (from the audio samples, against the
//   recording's own first sound);
// - each caption changes on screen as its speech starts (from the caption strip's pixels: the
//   old words fade out and the new ones in), and the title cards lift and show with theirs.
// Exits 1 if a line can't be found, the mean gap between a caption and its voice is over 0.1 s,
// any one is over 0.2 s, or the gap drifts by more than 0.1 s from the start to the end.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const VIDEO = path.resolve('public/video/how-luchoai-works.mp4');
const VOICE_DIR = path.resolve('scripts/tour-voice');
const LINES = JSON.parse(fs.readFileSync(path.join(VOICE_DIR, 'lines.json'), 'utf8'));
const TIMELINE = JSON.parse(fs.readFileSync(path.join(VOICE_DIR, 'timeline.json'), 'utf8')).lines;
const FPS = 30;
const RATE = 16000;
const HOP = RATE / 100;
// Quieter than this (RMS of a 10 ms hop) is silence: the clips are levelled to -20 dBFS.
const SILENCE = 10 ** (-40 / 20);
// The caption strip: the top 104 of 720 CSS pixels, recorded at 16/9.
const STRIP = { crop: 'crop=720:184:0:0', width: 180, height: 46 };
const FRAME = { width: 90, height: 160 };
// Lines said over a title card rather than shown in the caption strip.
const CARD_LINES = new Set(['intro-1', 'start-1', 'outro-1']);

const failures = [];
const expect = (ok, message) => {
  if (!ok) failures.push(message);
};

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-v', 'error', ...args, '-'], {
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}:\n${result.stderr}`);
  return result.stdout;
}

const samples = (file) => {
  const bytes = ffmpeg(['-i', file, '-map', '0:a:0', '-ac', '1', '-ar', String(RATE), '-f',
    'f32le']);
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
};

// Times (s) where sound starts after at least `gap` seconds of silence.
function onsets(audio, gap = 0.3) {
  const found = [];
  let quiet = gap * 100;
  for (let hop = 0; (hop + 1) * HOP <= audio.length; hop += 1) {
    let sum = 0;
    for (let i = hop * HOP; i < (hop + 1) * HOP; i += 1) sum += audio[i] * audio[i];
    if (Math.sqrt(sum / HOP) < SILENCE) {
      quiet += 1;
    } else {
      if (quiet >= gap * 100) found.push(hop / 100);
      quiet = 0;
    }
  }
  return found;
}

const nearest = (times, target, within) => {
  const distance = (t) => Math.abs(t - target);
  const best = times.reduce((a, b) => (distance(b) < distance(a) ? b : a), Infinity);
  return distance(best) <= within ? best : null;
};

// One grey value per pixel, frame after frame, for the whole video.
function frames({ crop, width, height }) {
  const scale = `scale=${width}:${height}:flags=area,format=gray`;
  const bytes = ffmpeg(['-i', VIDEO, '-map', '0:v:0', '-vf', crop ? `${crop},${scale}` : scale,
    '-f', 'rawvideo']);
  const size = width * height;
  const count = bytes.length / size;
  return Array.from({ length: count }, (_, i) => bytes.subarray(i * size, (i + 1) * size));
}

// How much bright text the caption strip shows: the green behind it stays under 100.
const ink = (frame) => frame.reduce((sum, grey) => sum + Math.max(0, grey - 100), 0);

// When the caption strip's words swap: the middle of the dip where the old words have faded out
// and the new ones have not yet faded in.
function captionChange(strip, at) {
  const from = Math.max(1, Math.round((at - 0.5) * FPS));
  const to = Math.min(strip.length - 1, Math.round((at + 0.4) * FPS));
  const values = [];
  for (let i = from; i <= to; i += 1) values.push(ink(strip[i]));
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === 0 || low > high * 0.15) return null;
  const dip = values.flatMap((v, i) => (v <= low + (high - low) * 0.1 ? [from + i] : []));
  return (dip[0] + dip.at(-1)) / 2 / FPS;
}

// When a title card starts to lift or show: the first frame that moves after a still one.
function cardChange(small, at) {
  const from = Math.max(1, Math.round((at - 0.4) * FPS));
  const to = Math.min(small.length - 1, Math.round((at + 0.5) * FPS));
  for (let i = from; i <= to; i += 1) {
    let diff = 0;
    for (let p = 0; p < small[i].length; p += 1) diff += Math.abs(small[i][p] - small[i - 1][p]);
    if (diff / small[i].length > 1.5) return i / FPS;
  }
  return null;
}

// ── The timeline ─────────────────────────────────────────────────────────────
const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries',
  'format=duration:format_tags=comment:stream=codec_type,codec_name,channels', '-of', 'json',
  VIDEO], { encoding: 'utf8' }).stdout);
const seconds = Number(probe.format.duration);
const audioStreams = probe.streams.filter((s) => s.codec_type === 'audio');
expect(audioStreams.length === 1, `expected one audio track, found ${audioStreams.length}`);
expect(audioStreams[0]?.codec_name === 'aac', `audio is ${audioStreams[0]?.codec_name}, not AAC`);
expect(audioStreams[0]?.channels === 1, 'the voice is not mono');
expect(/AI-generated/.test(probe.format.tags?.comment ?? ''), 'not labelled as an AI voice');

const ids = TIMELINE.map((line) => line.id);
expect(ids.join() === LINES.map((line) => line.id).join(), `timeline lines: ${ids.join(', ')}`);
TIMELINE.forEach((line, i) => {
  const before = TIMELINE[i - 1];
  if (before) {
    const gap = line.start - (before.start + before.ms / 1000);
    expect(gap >= 0, `${line.id} starts ${(-gap).toFixed(2)} s before ${before.id} ends`);
  }
});
const last = TIMELINE.at(-1);
expect(last.start + last.ms / 1000 <= seconds, `${last.id} runs past the end of the video`);

// ── Sound and picture ────────────────────────────────────────────────────────
const soundtrack = onsets(samples(VIDEO));
const strip = frames(STRIP);
const small = frames(FRAME);
const rows = [];
for (const line of TIMELINE) {
  const lead = onsets(samples(path.join(VOICE_DIR, 'clips', `${line.id}.mp3`)))[0] ?? 0;
  const heard = nearest(soundtrack, line.start + lead, 0.3);
  const voice = heard === null ? null : heard - lead;
  let seen = null;
  if (line.id === 'intro-1') seen = undefined;
  else if (CARD_LINES.has(line.id)) seen = cardChange(small, line.start);
  else seen = captionChange(strip, line.start);
  expect(voice !== null, `${line.id}: no speech within 0.3 s of ${line.start.toFixed(2)} s`);
  expect(seen !== null, `${line.id}: the picture does not change near ${line.start.toFixed(2)} s`);
  rows.push({ ...line, voice, seen });
}

const fmt = (s) => (s === null || s === undefined ? '  -   ' : (s < 0 ? '' : '+') + s.toFixed(3));
console.log('line      starts   voice vs timeline   caption vs voice');
for (const row of rows) {
  const placed = row.voice === null ? null : row.voice - row.start;
  const gap = row.voice === null || !row.seen ? null : row.seen - row.voice;
  console.log(`${row.id.padEnd(9)} ${row.start.toFixed(2).padStart(6)} s   ${fmt(placed)} s` +
    `            ${row.seen === undefined ? 'title card, voice only' : `${fmt(gap)} s`}`);
}

const pairs = rows.filter((r) => r.voice !== null && r.seen);
const gaps = pairs.map((r) => r.seen - r.voice);
const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
const worst = Math.max(...gaps.map(Math.abs));
// Least-squares slope of the gap over time, as the change from the first line to the last.
const ts = pairs.map((r) => r.start);
const tMean = ts.reduce((a, b) => a + b, 0) / ts.length;
const slope = ts.reduce((s, t, i) => s + (t - tMean) * (gaps[i] - mean), 0) /
  ts.reduce((s, t) => s + (t - tMean) ** 2, 0);
const drift = slope * (ts.at(-1) - ts[0]);
const placement = rows.filter((r) => r.voice !== null).map((r) => Math.abs(r.voice - r.start));
console.log(`\n${pairs.length} of ${rows.length - 1} captions matched their voice: mean gap ` +
  `${fmt(mean)} s, worst ${worst.toFixed(3)} s, drift ${fmt(drift)} s over ` +
  `${(ts.at(-1) - ts[0]).toFixed(0)} s. Voice placed within ` +
  `${Math.max(...placement).toFixed(3)} s of the timeline. Video ${seconds.toFixed(2)} s.`);
expect(pairs.length === rows.length - 1, 'not every caption could be matched to its voice');
expect(Math.abs(mean) <= 0.1, `mean gap ${mean.toFixed(3)} s is over 0.1 s`);
expect(worst <= 0.2, `a caption is ${worst.toFixed(3)} s from its voice`);
expect(Math.abs(drift) <= 0.1, `the gap drifts by ${drift.toFixed(3)} s`);
expect(Math.max(...placement) <= 0.05, 'a line is not where the timeline says');

if (failures.length) {
  console.log(`\nOut of sync:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Voice and captions are in sync.');
