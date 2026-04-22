#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
errors=0
check(){ if "$@"; then echo "PASS: $*"; else echo "FAIL: $*"; errors=$((errors+1)); fi; }
for cmd in node npm python3 docker; do check command -v "$cmd"; done
check test -s package-lock.json
check test -s .env
if test -f .env; then
  if grep -qE '(REPLACE_|example\.com|example\.invalid)' .env; then echo 'FAIL: Example credentials/domain present in .env'; errors=$((errors+1)); fi
  if grep -Eq '^(POSTGRES_PASSWORD|KEYCLOAK_DB_PASSWORD|MP_CLIENT_SECRET|KEYCLOAK_CLIENT_SECRET)=$' .env; then echo 'FAIL: empty required credential'; errors=$((errors+1)); fi
fi
if command -v docker >/dev/null; then
  check docker compose --env-file .env -f compose/compose.yaml config --quiet
fi
if [[ "$errors" != 0 ]]; then echo "PREFLIGHT FAIL: ${errors} gate(s)" >&2; exit 1; fi
echo 'PREFLIGHT PASS: static local release prerequisites (not an E2E or provider verification).'
