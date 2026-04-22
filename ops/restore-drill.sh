#!/usr/bin/env bash
set -Eeuo pipefail
: "${RESTORE_DATABASE_URL:?Separate disposable destination is required}"
: "${AGE_IDENTITY:?Path to age private identity is required}"
: "${1:?Pass an encrypted .dump.age backup path}"
command -v pg_restore >/dev/null
command -v age >/dev/null
command -v psql >/dev/null
# Fail closed: the target DB is deliberately required to be named 'nexa_restore_*'.
python3 - "$RESTORE_DATABASE_URL" <<'PY'
import sys
from urllib.parse import urlparse
p=urlparse(sys.argv[1]); db=(p.path or '').lstrip('/')
if not db.startswith('nexa_restore_') or db=='nexamarket' or not p.hostname:
    raise SystemExit('Restore drill requires a separate nexa_restore_* database, never nexamarket')
PY
TMP="$(mktemp)";trap 'rm -f "$TMP"' EXIT
chmod 600 "$TMP"
age --decrypt --identity "$AGE_IDENTITY" --output "$TMP" "$1"
pg_restore --exit-on-error --no-owner --no-acl --clean --if-exists --dbname "$RESTORE_DATABASE_URL" "$TMP"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) >= 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders'" | grep -Fxq t
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) >= 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ledger_journals'" | grep -Fxq t
echo 'RESTORE_DRILL PASS: schema restored; business-level data comparisons still required.'
