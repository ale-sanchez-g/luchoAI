const registered = new Set<string>();

const TOKEN_PATTERNS: RegExp[] = [
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /npm_[A-Za-z0-9]{30,}/g,
  /x-access-token:[^@\s]+@/g,
  /(authorization:\s*(?:bearer|token|basic)\s+)[A-Za-z0-9._~+/=-]{8,}/gi,
];

/** Remembers a secret value so every later `redact` call removes it. */
export function registerSecret(value: string | undefined | null): void {
  if (value && value.length >= 8) {
    registered.add(value);
  }
}

/** Removes registered secrets and well-known token shapes from text bound for logs or reports. */
export function redact(text: string): string {
  let out = text;
  for (const secret of registered) {
    out = out.split(secret).join('***');
  }
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, (match, prefix?: string) =>
      typeof prefix === 'string' && match.startsWith(prefix) ? `${prefix}***` : '***',
    );
  }
  return out;
}

const SENSITIVE_ENV = /(TOKEN|SECRET|PASSWORD|PRIVATE_KEY|CREDENTIAL|API_KEY)/i;

/**
 * Returns a copy of the environment without credential-like variables. Used for every command
 * that executes repository or dependency code.
 */
export function sanitizedEnv(
  base: NodeJS.ProcessEnv,
  overrides: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(base)) {
    if (!SENSITIVE_ENV.test(key)) {
      env[key] = value;
    }
  }
  return { ...env, ...overrides };
}
