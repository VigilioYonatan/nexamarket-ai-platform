#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p evidence
{
  printf 'UTC=%s\n' "$(date -u +%FT%TZ)"
  printf 'COMMIT=%s\n' "$(git rev-parse HEAD 2>/dev/null || echo UNVERSIONED)"
  node --version
  python3 --version
  echo '--- Domain tests ---'
  node --experimental-strip-types --test packages/domain/test/*.test.ts
  echo '--- Python tests ---'
  (cd apps/ai && python3 -m pytest -q)
} 2>&1 | tee "evidence/offline-$(date -u +%Y%m%dT%H%M%SZ).log"
