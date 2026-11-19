#!/usr/bin/env python3
"""Records the tour video's voice-over: one MP3 per narrated line, made with Kokoro-82M.

The lines are the tour's captions (lines.json, a list of {"id", "text"}), so the words exist once.
Writes clips/<id>.mp3 and clips/lengths.json: each recording's length in ms and the words it was
made from. scripts/how-it-works-video.mjs times the tour from those lengths and stops if a line
changed after its clip was recorded. Set-up and the full re-record steps: README.md, "Re-record
the home page video". Kokoro-82M is an open text-to-speech model (Apache-2.0) from Hugging Face;
it runs on the CPU in about a second per line. The voice is AI-generated: the home page says so.

Usage: python scripts/tour-voice/generate.py [lines.json] [out-dir] [--voice bf_emma] [--phonemes]
"""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'

# How the narrator should say things written for readers. Captions keep the written form. Check
# with --phonemes: "IQ" on its own comes out as /ˈɪk/ ("ick"), and "I.Q." adds pauses.
SPOKEN = [(r'\bIQ\b', 'eye-Q')]
# Fixes no spelling can make. "Lucho" needs a little stress on "-cho": without it Whisper small
# heard "Lucha AI" in "Open LuchoAI and tap", where both models hear "Lucho" with it.
PHONEMES = [('lˈuːtʃəʊ', 'lˈuːtʃˌəʊ')]


def spoken(text):
    for pattern, said in SPOKEN:
        text = re.sub(pattern, said, text)
    return text


def phonemes(tts, text, lang):
    said = tts.tokenizer.phonemize(spoken(text), lang=lang)
    for pattern, fixed in PHONEMES:
        said = said.replace(pattern, fixed)
    return said


def tidy(audio, sr, lead=0.06, tail=0.12, floor=0.02):
    """Trim silence, then level every line equally: -20 dBFS RMS, peaks under -1 dBFS."""
    loud = np.flatnonzero(np.abs(audio) > floor * np.abs(audio).max())
    audio = audio[max(0, loud[0] - int(lead * sr)): loud[-1] + int(tail * sr)].astype(np.float32)
    rms = float(np.sqrt(np.mean(audio ** 2))) or 1.0
    return audio * min(0.1 / rms, 0.89 / float(np.abs(audio).max()))


def encode(audio, sr, target, comment):
    with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
        sf.write(wav.name, audio, sr)
        # bitexact: the same recording gives the same bytes, so git only sees real changes.
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav.name, '-ac', '1', '-ar', '44100',
                        '-c:a', 'libmp3lame', '-b:a', '64k', '-fflags', '+bitexact',
                        '-flags:a', '+bitexact', '-metadata', f'comment={comment}', str(target)],
                       check=True)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'csv=p=0', str(target)], check=True, capture_output=True,
                           text=True)
    return round(float(probe.stdout) * 1000)


def main():
    ap = argparse.ArgumentParser(description='Record the tour voice-over with Kokoro-82M.')
    ap.add_argument('lines', nargs='?', type=Path, default=HERE / 'lines.json')
    ap.add_argument('out', nargs='?', type=Path, default=HERE / 'clips')
    ap.add_argument('--model-dir', type=Path, default=Path.home() / 'kokoro')
    ap.add_argument('--voice', default='bf_emma')
    ap.add_argument('--speed', type=float, default=0.9)
    ap.add_argument('--lang', default='en-gb')  # en-us for American voices
    ap.add_argument('--phonemes', action='store_true',
                    help='print how each line will be said, and record nothing')
    args = ap.parse_args()

    voice = np.fromfile(args.model_dir / 'voices' / f'{args.voice}.bin', np.float32)
    np.savez(args.model_dir / 'voices.npz', **{args.voice: voice.reshape(-1, 1, 256)})
    tts = Kokoro(str(args.model_dir / 'model.onnx'), str(args.model_dir / 'voices.npz'))
    lines = json.loads(args.lines.read_text())

    if args.phonemes:
        for line in lines:
            print(f"{line['id']}: {phonemes(tts, line['text'], args.lang)}")
        return

    args.out.mkdir(parents=True, exist_ok=True)
    model_sha = hashlib.sha256((args.model_dir / 'model.onnx').read_bytes()).hexdigest()
    comment = f'AI-generated voice: Kokoro-82M, {args.voice}'
    recorded = {}
    for line in lines:
        audio, sr = tts.create(phonemes(tts, line['text'], args.lang), voice=args.voice,
                               speed=args.speed, lang=args.lang, is_phonemes=True)
        ms = encode(tidy(audio, sr), sr, args.out / f"{line['id']}.mp3", comment)
        recorded[line['id']] = {'ms': ms, 'text': line['text']}
        print(f"{line['id']}: {ms / 1000:.2f}s")
    # A clip whose line was removed would linger in git unnoticed.
    for clip in sorted(args.out.glob('*.mp3')):
        if clip.stem not in recorded:
            clip.unlink()
            print(f'removed {clip.name}: no line has that id')
    (args.out / 'lengths.json').write_text(json.dumps({
        'model': MODEL,
        'modelSha256': model_sha,
        'voice': args.voice,
        'speed': args.speed,
        'lang': args.lang,
        'lines': recorded,
    }, indent=2, ensure_ascii=False) + '\n')
    total = sum(r['ms'] for r in recorded.values()) / 1000
    print(f'{len(recorded)} lines, {total:.1f}s of speech -> {args.out}')


if __name__ == '__main__':
    main()
