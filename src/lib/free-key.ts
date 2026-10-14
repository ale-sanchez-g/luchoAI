export const FREE_QUESTION_LIMIT = 5;

// Not a secret: it only keeps the key out of plain-text scans of the published bundle. Anyone
// can still read the key in their browser, so restrict it in Google AI Studio (see docs).
const SALT = 'luchoai-free-questions';

function xor(text: string): string {
  return Array.from(text, (ch, i) =>
    String.fromCharCode(ch.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length)),
  ).join('');
}

/** Build-time: turns the deploy secret into the value baked into the static bundle. */
export function encodeFreeKey(plain: string): string {
  return plain ? btoa(xor(plain)) : '';
}

/** Run-time: returns the baked-in key, or null when this build was made without one. */
export function decodeFreeKey(encoded: string | undefined): string | null {
  if (!encoded) return null;
  try {
    return xor(atob(encoded));
  } catch {
    return null;
  }
}

export function getFreeKey(): string | null {
  return decodeFreeKey(process.env.NEXT_PUBLIC_FREE_KEY_ENC);
}
