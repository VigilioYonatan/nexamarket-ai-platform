#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$ROOT/.env" ] || { echo 'ERROR: .env missing' >&2; exit 1; }
set -a; source "$ROOT/.env"; set +a
: "${INTERNAL_METRICS_TOKEN:?INTERNAL_METRICS_TOKEN is required}"
umask 077
mkdir -p "$ROOT/infra/observability/private"
printf '%s' "$INTERNAL_METRICS_TOKEN" > "$ROOT/infra/observability/private/metrics_token"
chmod 600 "$ROOT/infra/observability/private/metrics_token"
echo 'Prometheus token file prepared with restrictive permissions.'
