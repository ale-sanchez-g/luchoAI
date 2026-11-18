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
      screen.getByRole('button', { name: `Watch how it works ${TOUR_LENGTH} · no sound` }),
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
