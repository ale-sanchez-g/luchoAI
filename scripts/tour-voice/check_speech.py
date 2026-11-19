#!/usr/bin/env python3
"""Checks the tour voice-over by ear, with Whisper: transcribes each clip and compares the words.

Nobody has to listen to know a line was read right: a separate speech-to-text model must hear
every word of its line. Prints each line's word error rate (WER), raw and after normalising
spellings that sound the same ("8" and "eight", "LuchoAI" and "Lucho AI"). With --video it checks
the finished MP4 too: each line is cut from its soundtrack where timeline.json says it is, so the
compressed audio is heard line by line (Whisper skips speech after long silences when given the
whole soundtrack at once). Exits 1 when a normalised WER is over 5% or any line's over 25%.

Usage: HF_HUB_DISABLE_XET=1 python scripts/tour-voice/check_speech.py [--video file.mp4]
Needs faster-whisper (pip install faster-whisper==1.2.1); the small.en model downloads from
Hugging Face on first use.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

HERE = Path(__file__).resolve().parent
NUMBERS = {'1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '8': 'eight',
           '18': 'eighteen'}
# Spellings of the same sounds. Applied to the script and to what Whisper heard alike.
SAME = [
    (r'\blucho ?a ?i\b', 'luchoai'),
    (r'\b(?:eye|i) ?q\b', 'iq'),
    (r'\ba ?i\b', 'ai'),
    (r'\bwell ?being\b', 'wellbeing'),
    (r'\bgrown ?up\b', 'grownup'),
]


def words(text, normalise):
    text = text.lower().replace('-', ' ')
    text = re.sub(r"[^a-z0-9' ]+", ' ', text)
    tokens = text.split()
    if not normalise:
        return tokens
    text = ' '.join(NUMBERS.get(t, t) for t in tokens)
    for pattern, same in SAME:
        text = re.sub(pattern, same, text)
    return text.split()


def errors(ref, hyp):
    """Word-level edit distance: substitutions + deletions + insertions."""
    row = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, row[0] = row[0], i
        for j, h in enumerate(hyp, 1):
            prev, row[j] = row[j], min(row[j] + 1, row[j - 1] + 1, prev + (r != h))
    return row[-1]


def heard(model, path, start=None, seconds=None):
    # Decode with ffmpeg: recent PyAV rejects an argument faster-whisper passes when it decodes.
    cut = [] if start is None else ['-ss', f'{start:.3f}', '-t', f'{seconds:.3f}']
    pcm = subprocess.run(['ffmpeg', '-v', 'error', *cut, '-i', str(path), '-map', '0:a:0',
                          '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    segments, _ = model.transcribe(np.frombuffer(pcm, np.float32), language='en', beam_size=5)
    return ' '.join(s.text.strip() for s in segments)


def score(lines, hear):
    """Prints each line's raw and normalised WER; returns (normalised WER, worst line's)."""
    totals = {False: [0, 0], True: [0, 0]}
    worst = 0.0
    for line in lines:
        hyp = hear(line)
        rates = []
        for normalise in (False, True):
            ref_words = words(line['text'], normalise)
            wrong = errors(ref_words, words(hyp, normalise))
            totals[normalise][0] += wrong
            totals[normalise][1] += len(ref_words)
            rates.append(wrong / len(ref_words))
        worst = max(worst, rates[1])
        flag = '' if rates[1] == 0 else '  <-- check'
        print(f"{line['id']:8} raw {rates[0]:5.1%}  normalised {rates[1]:5.1%}  heard: {hyp}{flag}")
    raw = totals[False][0] / totals[False][1]
    normalised = totals[True][0] / totals[True][1]
    print(f'All {len(lines)} lines: raw WER {raw:.1%}, normalised WER {normalised:.1%} '
          f'({totals[True][0]} of {totals[True][1]} words)\n')
    return normalised, worst


def main():
    ap = argparse.ArgumentParser(description='Check the tour voice-over with Whisper.')
    ap.add_argument('--lines', type=Path, default=HERE / 'lines.json')
    ap.add_argument('--clips', type=Path, default=HERE / 'clips')
    ap.add_argument('--video', type=Path, help='also transcribe this MP4 soundtrack')
    ap.add_argument('--model', default='small.en')
    args = ap.parse_args()

    model = WhisperModel(args.model, device='cpu', compute_type='int8')
    lines = json.loads(args.lines.read_text())
    print(f'Recordings in {args.clips.name}/:')
    results = [score(lines, lambda line: heard(model, args.clips / f"{line['id']}.mp3"))]

    if args.video:
        timeline = {t['id']: t for t in json.loads((HERE / 'timeline.json').read_text())['lines']}
        print(f'{args.video.name}, each line cut from the soundtrack:')
        results.append(score(lines, lambda line: heard(
            model, args.video, max(0.0, timeline[line['id']]['start'] - 0.1),
            timeline[line['id']]['ms'] / 1000 + 0.2)))
    sys.exit(1 if any(rate > 0.05 or worst > 0.25 for rate, worst in results) else 0)


if __name__ == '__main__':
    main()
