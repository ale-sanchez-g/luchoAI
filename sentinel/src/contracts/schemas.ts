import fs from 'node:fs';
import path from 'node:path';
import type { JsonSchema, SchemaError } from './schema-validator';
import { assertSupportedSchema, validateAgainstSchema } from './schema-validator';

/** Directory holding the JSON Schemas, valid from both `src/` (tests) and `dist/` (runtime). */
export const SCHEMA_DIR = path.resolve(__dirname, '..', '..', 'schemas');

const loaded = new Map<string, JsonSchema>();

/** Loads `sentinel/schemas/<name>.schema.json`. */
export function loadSchema(name: string): JsonSchema {
  const cached = loaded.get(name);
  if (cached) {
    return cached;
  }
  const file = path.join(SCHEMA_DIR, `${name}.schema.json`);
  const schema = JSON.parse(fs.readFileSync(file, 'utf8')) as JsonSchema;
  loaded.set(name, schema);
  return schema;
}

/** Validates a value against a named schema; cross-file `$ref`s resolve within SCHEMA_DIR. */
export function validateWithSchema(name: string, value: unknown): SchemaError[] {
  const resolver = (file: string): JsonSchema => {
    if (!/^[a-z0-9-]+\.schema\.json$/.test(file)) {
      throw new Error(`Refusing to load schema "${file}"`);
    }
    const schema = loadSchema(file.replace(/\.schema\.json$/, ''));
    assertSupportedSchema(schema);
    return schema;
  };
  return validateAgainstSchema(loadSchema(name), value, resolver);
}

/** Formats schema errors for a single readable message. */
export function formatSchemaErrors(errors: SchemaError[], limit = 20): string {
  const lines = errors.slice(0, limit).map((e) => `  - ${e.path}: ${e.message}`);
  if (errors.length > limit) {
    lines.push(`  - ... and ${errors.length - limit} more`);
  }
  return lines.join('\n');
}
