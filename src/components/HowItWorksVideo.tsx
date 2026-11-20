'use client';

import { useEffect, useRef, useState } from 'react';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const TOUR_VIDEO_SRC = `${BASE_PATH}/video/how-luchoai-works.mp4`;
export const TOUR_POSTER_SRC = `${BASE_PATH}/video/how-luchoai-works-poster.webp`;
/** Length of the tour video as a player shows it (m:ss). HowItWorksVideo.test.tsx checks it. */
export const TOUR_LENGTH = '1:39';

function soundBlocked(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) return false;
  return error.name === 'NotAllowedError';
}

/**
 * The home page tour, recorded from the real app by scripts/how-it-works-video.mjs, with an
 * AI-generated voice reading out the captions. Nothing is downloaded until the play button is
 * pressed, so the page stays light on phone data.
 */
export default function HowItWorksVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [silent, setSilent] = useState(false);

  // The play button disappears once pressed, so keyboard focus moves to the player's controls.
  useEffect(() => {
    if (started) videoRef.current?.focus();
  }, [started]);

  function start(): void {
    setStarted(true);
    const video = videoRef.current;
    if (!video) return;
    // play() must run inside the tap itself, or phones block it and its sound.
    video.play().catch((error: unknown) => {
      // Some browsers only allow silent videos. The captions carry every word, so play on.
      if (!soundBlocked(error) || video.muted) {
        setFailed(true);
        return;
      }
      video.muted = true;
      setSilent(true);
      video.play().catch(() => setFailed(true));
    });
  }

  return (
    <figure className="mx-auto w-full max-w-[17.5rem] sm:max-w-xs">
      {/* The frame sits outside the 9:16 box, so the video fills it with no bars. */}
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-white bg-pitch-dark shadow-2xl">
        <div className="relative aspect-[9/16]">
          <video
            ref={videoRef}
            src={TOUR_VIDEO_SRC}
            poster={TOUR_POSTER_SRC}
            preload="none"
            playsInline
            controls={started && !failed}
            tabIndex={started ? 0 : -1}
            onError={() => setFailed(true)}
            onVolumeChange={(e) => {
              if (!e.currentTarget.muted) setSilent(false);
            }}
            aria-label="Video: how LuchoAI works"
            className="h-full w-full object-contain"
          />
          {!started && (
            <button
              type="button"
              onClick={start}
              className="group absolute inset-0 flex flex-col items-center justify-end p-4 focus-visible:outline-none"
            >
              <span className="flex items-center gap-3 rounded-full bg-gold py-2 pl-2 pr-5 text-left text-[0.9375rem] font-bold text-gray-900 shadow-lg ring-white transition-transform group-hover:scale-105 group-focus-visible:ring-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white">
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="M8 5.5v13l10.5-6.5z" fill="#0f5a2b" />
                  </svg>
                </span>
                <span>
                  Watch how it works{' '}
                  <span className="block text-xs font-semibold">{TOUR_LENGTH} · with sound</span>
                </span>
              </span>
            </button>
          )}
          {failed && (
            <p
              role="status"
              className="absolute inset-x-3 bottom-3 rounded-xl bg-white p-3 text-sm font-medium text-pitch-dark"
            >
              The video could not load. The four steps below show the same thing in words.
            </p>
          )}
        </div>
      </div>
      {silent && !failed && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-white p-3 text-sm font-medium text-pitch-dark"
        >
          The sound is off, but the words are on screen. Tap the speaker to hear the voice.
        </p>
      )}
      <figcaption className="mt-3 text-center text-sm text-green-100">
        A quick tour of the real app, read out by an AI&nbsp;voice. The words are on screen too.
      </figcaption>
    </figure>
  );
}
