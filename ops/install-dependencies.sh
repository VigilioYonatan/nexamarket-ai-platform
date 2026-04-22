#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
command -v npm >/dev/null
if [[ ! -f package-lock.json ]]; then
  echo 'Creating lockfile from approved npm registry. Review/audit it before deployment.'
  npm install --package-lock-only --ignore-scripts --no-audit --no-fund
fi
npm ci --no-audit --no-fund
npm run build --workspace=@nexa/domain
npm run typecheck
