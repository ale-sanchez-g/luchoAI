import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HowItWorksVideo, {
  TOUR_LENGTH,
  TOUR_POSTER_SRC,
  TOUR_VIDEO_SRC,
} from '@/components/HowItWorksVideo';

const PUBLIC = path.resolve(__dirname, '../../public');
const VIDEO_FILE = path.join(PUBLIC, 'video/how-luchoai-works.mp4');
const POSTER_FILE = path.join(PUBLIC, 'video/how-luchoai-works-poster.webp');
// Over phone data a page should stay light: the video only loads when played, but keep it small.
const MAX_VIDEO_BYTES = 3 * 1024 * 1024;
const MAX_POSTER_BYTES = 60 * 1024;

// The voice-over: scripts/tour-voice (see scripts/how-it-works-video.mjs).
const VOICE_DIR = path.resolve(__dirname, '../../scripts/tour-voice');
const readJson = <T,>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(VOICE_DIR, file), 'utf8')) as T;
interface Line {
  id: string;
  text: string;
}
interface Recording {
  ms: number;
  text: string;
}
interface Cue {
  id: string;
  start: number;
  ms: number;
}
const LINES = readJson<Line[]>('lines.json');
const RECORDED = readJson<{ lines: Record<string, Recording> }>('clips/lengths.json').lines;
const TIMELINE = readJson<{ lines: Cue[] }>('timeline.json').lines;

/** The handler type of every track in an MP4 ("vide", "soun"), from its "hdlr" boxes. */
function trackKinds(data: Buffer): string[] {
  const kinds: string[] = [];
  for (let at = data.indexOf('hdlr'); at !== -1; at = data.indexOf('hdlr', at + 4)) {
    kinds.push(data.toString('latin1', at + 12, at + 16));
  }
  return kinds;
}

/** Reads a movie's length from its MP4 header ("mvhd" box), so no video tools are needed. */
function mp4Seconds(file: string): number {
  const data = fs.readFileSync(file);
  const at = data.indexOf('mvhd');
  if (at === -1) throw new Error(`${file} has no mvhd box`);
  const version = data[at + 4];
  const timescaleAt = at + 8 + (version === 1 ? 16 : 8);
  const timescale = data.readUInt32BE(timescaleAt);
  const duration =
    version === 1
      ? Number(data.readBigUInt64BE(timescaleAt + 4))
      : data.readUInt32BE(timescaleAt + 4);
  return duration / timescale;
}

// Whole seconds, rounded down, the way video players show a length.
function asClock(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

describe('HowItWorksVideo', () => {
  let play: jest.SpyInstance;
  beforeEach(() => {
    play = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });
  afterEach(() => play.mockRestore());

  const video = (): HTMLVideoElement =>
    screen.getByLabelText('Video: how LuchoAI works') as HTMLVideoElement;

  it('shows the poster and downloads nothing until play is pressed', () => {
    render(<HowItWorksVideo />);
    expect(video()).toHaveAttribute('preload', 'none');
    expect(video()).toHaveAttribute('poster', TOUR_POSTER_SRC);
    expect(video()).toHaveAttribute('src', TOUR_VIDEO_SRC);
    expect(video()).toHaveAttribute('playsinline');
    expect(video()).not.toHaveAttribute('controls');
    expect(
      screen.getByRole('button', { name: `Watch how it works ${TOUR_LENGTH} · with sound` }),
    ).toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
  });

  it('plays when the button is pressed, then hands over to the player controls', async () => {
    render(<HowItWorksVideo />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Watch how it works/ }));
    });
    expect(play).toHaveBeenCalledTimes(1);
    expect(video()).toHaveAttribute('controls');
    expect(screen.queryByRole('button', { name: /Watch how it works/ })).not.toBeInTheDocument();
    expect(video()).toHaveFocus();
  });

  it('plays with the voice on, and says the voice is made by AI', async () => {
    render(<HowItWorksVideo />);
    expect(video().muted).toBe(false);
    expect(screen.getByText(/read out by an AI\svoice/)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Watch how it works/ }));
    });
    expect(play).toHaveBeenCalledTimes(1);
    expect(video().muted).toBe(false);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('plays on without sound, and says so, when the browser blocks the voice', async () => {
    play.mockRejectedValueOnce(new DOMException('Sound needs a tap', 'NotAllowedError'));
    render(<HowItWorksVideo />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Watch how it works/ }));
    });
    expect(play).toHaveBeenCalledTimes(2);
    expect(video().muted).toBe(true);
    expect(video()).toHaveAttribute('controls');
    expect(screen.getByRole('status')).toHaveTextContent(
      'The sound is off, but the words are on screen.',
    );
    // Turning the sound on with the player's speaker (a "volumechange") hides the note.
    act(() => {
      video().muted = false;
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says only that the video could not load when it cannot play even without sound', async () => {
    play.mockRejectedValue(new DOMException('Blocked', 'NotAllowedError'));
    render(<HowItWorksVideo />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Watch how it works/ }));
    });
    expect(screen.getByRole('status')).toHaveTextContent(/The video could not load/);
    expect(screen.queryByText(/The sound is off/)).not.toBeInTheDocument();
  });

  it('says so in words when the video cannot play', async () => {
    play.mockRejectedValue(new Error('NotSupportedError'));
    render(<HowItWorksVideo />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Watch how it works/ }));
    });
    expect(screen.getByRole('status')).toHaveTextContent(/The video could not load/);
    expect(video()).not.toHaveAttribute('controls');
  });

  it('serves a small video and poster from public/', () => {
    expect(TOUR_VIDEO_SRC).toMatch(/\/video\/how-luchoai-works\.mp4$/);
    expect(TOUR_POSTER_SRC).toMatch(/\/video\/how-luchoai-works-poster\.webp$/);
    expect(fs.statSync(VIDEO_FILE).size).toBeLessThan(MAX_VIDEO_BYTES);
    expect(fs.statSync(POSTER_FILE).size).toBeLessThan(MAX_POSTER_BYTES);
  });

  it('labels the play button with the real length of the video', () => {
    expect(asClock(mp4Seconds(VIDEO_FILE))).toBe(TOUR_LENGTH);
  });
});

describe('the tour voice-over', () => {
  it('has a recording of every line, made from its current words', () => {
    for (const line of LINES) {
      expect(fs.existsSync(path.join(VOICE_DIR, 'clips', `${line.id}.mp3`))).toBe(true);
      // Edited after recording, a line would say its old words and be timed by its old length.
      expect(RECORDED[line.id]).toEqual({ ms: expect.any(Number), text: line.text });
    }
    expect(Object.keys(RECORDED).sort()).toEqual(LINES.map((line) => line.id).sort());
  });

  it('starts each line in the video only once the line before it has ended', () => {
    expect(TIMELINE.map((cue) => cue.id)).toEqual(LINES.map((line) => line.id));
    TIMELINE.forEach((cue, i) => {
      expect(cue.ms).toBe(RECORDED[cue.id].ms);
      if (i === 0) return;
      const before = TIMELINE[i - 1];
      expect(cue.start).toBeGreaterThanOrEqual(before.start + before.ms / 1000);
    });
    const last = TIMELINE[TIMELINE.length - 1];
    expect(last.start + last.ms / 1000).toBeLessThanOrEqual(mp4Seconds(VIDEO_FILE));
  });

  it('is in the video as its sound track, labelled as AI-generated', () => {
    const data = fs.readFileSync(VIDEO_FILE);
    expect(trackKinds(data).filter((kind) => kind === 'soun')).toHaveLength(1);
    expect(data.includes('mp4a')).toBe(true);
    expect(data.includes('AI-generated')).toBe(true);
  });
});
