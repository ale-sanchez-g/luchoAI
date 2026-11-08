import { createHash } from 'node:crypto';

/**
 * Serialises a JSON value with object keys sorted at every level, so equal data always produces
 * identical text (and therefore identical digests) regardless of key insertion order.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) {
        out[key] = sortKeys(v);
      }
    }
    return out;
  }
  return value;
}

/** Hex SHA-256 of a string or buffer. */
export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/** SHA-256 of the canonical JSON form of a value. */
export function digestOf(value: unknown): string {
  return sha256(canonicalJson(value));
}
