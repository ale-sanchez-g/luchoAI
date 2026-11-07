/**
 * Strict validator for the JSON Schema (draft-07) subset Sentinel's schemas use. Any keyword
 * outside the supported set makes the schema itself invalid, so a schema can never silently rely
 * on validation this implementation does not perform.
 */

export interface JsonSchema {
  [keyword: string]: unknown;
}

export interface SchemaError {
  path: string;
  message: string;
}

const ANNOTATIONS = new Set([
  '$schema',
  '$id',
  '$comment',
  'title',
  'description',
  'default',
  'examples',
  'definitions',
]);

const VALIDATION = new Set([
  'type',
  'properties',
  'required',
  'additionalProperties',
  'propertyNames',
  'items',
  'enum',
  'const',
  'minimum',
  'maximum',
  'minLength',
  'pattern',
  'minItems',
  'maxItems',
  'uniqueItems',
  '$ref',
  'oneOf',
  'anyOf',
  'format',
]);

const FORMATS: Record<string, RegExp> = {
  'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
};

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function matchesType(value: unknown, expected: string): boolean {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return actual === expected;
}

/** Loads another schema document by file name, for `$ref: "<file>#/definitions/<name>"`. */
export type SchemaResolver = (file: string) => JsonSchema;

interface Resolved {
  schema: JsonSchema;
  root: JsonSchema;
}

function resolveRef(root: JsonSchema, ref: string, resolver: SchemaResolver | null): Resolved {
  const match = /^([A-Za-z0-9_.-]+\.json)?#\/definitions\/([A-Za-z0-9_-]+)$/.exec(ref);
  if (!match) {
    throw new Error(`Unsupported $ref "${ref}"`);
  }
  let target = root;
  if (match[1]) {
    if (!resolver) {
      throw new Error(`Cross-file $ref "${ref}" needs a schema resolver`);
    }
    target = resolver(match[1]);
  }
  const defs = target.definitions as Record<string, JsonSchema> | undefined;
  if (!defs || !defs[match[2]]) {
    throw new Error(`Unresolvable $ref "${ref}"`);
  }
  return { schema: defs[match[2]], root: target };
}

/** Throws if the schema uses keywords this validator does not implement. */
export function assertSupportedSchema(schema: JsonSchema, path = '#'): void {
  for (const [keyword, value] of Object.entries(schema)) {
    if (!ANNOTATIONS.has(keyword) && !VALIDATION.has(keyword)) {
      throw new Error(`Unsupported schema keyword "${keyword}" at ${path}`);
    }
    if (keyword === 'definitions' || keyword === 'properties') {
      for (const [name, sub] of Object.entries(value as Record<string, JsonSchema>)) {
        assertSupportedSchema(sub, `${path}/${keyword}/${name}`);
      }
    } else if (keyword === 'items' || keyword === 'propertyNames') {
      assertSupportedSchema(value as JsonSchema, `${path}/${keyword}`);
    } else if (keyword === 'additionalProperties' && typeof value === 'object') {
      assertSupportedSchema(value as JsonSchema, `${path}/additionalProperties`);
    } else if (keyword === 'oneOf' || keyword === 'anyOf') {
      (value as JsonSchema[]).forEach((sub, i) =>
        assertSupportedSchema(sub, `${path}/${keyword}/${i}`),
      );
    } else if (keyword === 'format' && !FORMATS[value as string]) {
      throw new Error(`Unsupported format "${String(value)}" at ${path}`);
    }
  }
}

function validateNode(
  ctx: { root: JsonSchema; resolver: SchemaResolver | null },
  schema: JsonSchema,
  value: unknown,
  path: string,
  errors: SchemaError[],
): void {
  if (typeof schema.$ref === 'string') {
    const resolved = resolveRef(ctx.root, schema.$ref, ctx.resolver);
    validateNode(
      { root: resolved.root, resolver: ctx.resolver },
      resolved.schema,
      value,
      path,
      errors,
    );
    return;
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push({ path, message: `expected ${types.join(' or ')}, got ${typeOf(value)}` });
      return;
    }
  }
  if (schema.enum !== undefined && !(schema.enum as unknown[]).some((e) => e === value)) {
    errors.push({ path, message: `must be one of ${JSON.stringify(schema.enum)}` });
  }
  if (schema.const !== undefined && schema.const !== value) {
    errors.push({ path, message: `must equal ${JSON.stringify(schema.const)}` });
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push({ path, message: `must be >= ${schema.minimum}` });
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push({ path, message: `must be <= ${schema.maximum}` });
    }
  }
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      errors.push({ path, message: `must have length >= ${schema.minLength}` });
    }
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) {
      errors.push({ path, message: `must match ${schema.pattern}` });
    }
    if (typeof schema.format === 'string' && !FORMATS[schema.format].test(value)) {
      errors.push({ path, message: `must be a ${schema.format}` });
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push({ path, message: `must have >= ${schema.minItems} items` });
    }
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
      errors.push({ path, message: `must have <= ${schema.maxItems} items` });
    }
    if (schema.uniqueItems === true) {
      const seen = new Set(value.map((v) => JSON.stringify(v)));
      if (seen.size !== value.length) {
        errors.push({ path, message: 'items must be unique' });
      }
    }
    if (schema.items) {
      value.forEach((item, i) =>
        validateNode(ctx, schema.items as JsonSchema, item, `${path}[${i}]`, errors),
      );
    }
  }
  if (typeOf(value) === 'object') {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, JsonSchema>;
    for (const key of (schema.required ?? []) as string[]) {
      if (!(key in obj)) {
        errors.push({ path, message: `missing required property "${key}"` });
      }
    }
    for (const [key, child] of Object.entries(obj)) {
      if (schema.propertyNames) {
        validateNode(ctx, schema.propertyNames as JsonSchema, key, `${path}{${key}}`, errors);
      }
      if (props[key]) {
        validateNode(ctx, props[key], child, `${path}.${key}`, errors);
      } else if (schema.additionalProperties === false) {
        errors.push({ path, message: `unexpected property "${key}"` });
      } else if (typeof schema.additionalProperties === 'object') {
        validateNode(
          ctx,
          schema.additionalProperties as JsonSchema,
          child,
          `${path}.${key}`,
          errors,
        );
      }
    }
  }
  for (const keyword of ['oneOf', 'anyOf'] as const) {
    const options = schema[keyword] as JsonSchema[] | undefined;
    if (!options) continue;
    const passing = options.filter((option) => {
      const sub: SchemaError[] = [];
      validateNode(ctx, option, value, path, sub);
      return sub.length === 0;
    }).length;
    if (keyword === 'oneOf' && passing !== 1) {
      errors.push({ path, message: `must match exactly one schema in oneOf (matched ${passing})` });
    }
    if (keyword === 'anyOf' && passing === 0) {
      errors.push({ path, message: 'must match at least one schema in anyOf' });
    }
  }
}

/** Validates `value` against `schema`; returns the list of errors (empty when valid). */
export function validateAgainstSchema(
  schema: JsonSchema,
  value: unknown,
  resolver: SchemaResolver | null = null,
): SchemaError[] {
  assertSupportedSchema(schema);
  const errors: SchemaError[] = [];
  validateNode({ root: schema, resolver }, schema, value, '$', errors);
  return errors;
}
