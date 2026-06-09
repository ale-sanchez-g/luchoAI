#!/usr/bin/env bash
# Runs after every Edit or Write tool use to catch obvious issues early.

set -euo pipefail

CHANGED_FILE="${1:-}"

if [[ -z "$CHANGED_FILE" ]]; then
  echo "[validate-code] No file path provided, skipping."
  exit 0
fi

echo "[validate-code] Validating: $CHANGED_FILE"

# Only lint JS/TS files
if [[ "$CHANGED_FILE" =~ \.(js|jsx|ts|tsx)$ ]]; then
  if command -v npx &>/dev/null; then
    npx eslint --max-warnings=0 "$CHANGED_FILE" || {
      echo "[validate-code] ESLint found issues in $CHANGED_FILE"
      exit 1
    }
  fi
fi

# Check for secrets patterns (basic heuristic)
if grep -qE '(password|secret|api_key|apikey|token)\s*=\s*["\x27][^"\x27]{8,}' "$CHANGED_FILE" 2>/dev/null; then
  echo "[validate-code] WARNING: Possible hardcoded secret detected in $CHANGED_FILE"
  exit 1
fi

echo "[validate-code] OK"
exit 0
