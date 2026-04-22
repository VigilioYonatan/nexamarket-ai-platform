#!/usr/bin/env bash
# Creates encrypted PostgreSQL export. Destination must be backed by an independent off-host archive.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${AGE_RECIPIENT:?Provide age public recipient key}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077
command -v docker >/dev/null
command -v age >/dev/null
cd "$ROOT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="$BACKUP_DIR/nexamarket-$STAMP.dump.age"
FINAL_KC="$BACKUP_DIR/keycloak-$STAMP.dump.age"
TEMP="$(mktemp "$BACKUP_DIR/.pgdump.XXXXXXXX")"
TEMP_KC="$(mktemp "$BACKUP_DIR/.pgdump_kc.XXXXXXXX")"
trap 'rm -f "$TEMP" "$TEMP_KC"' EXIT
docker compose --env-file .env -f compose/compose.yaml exec -T postgres pg_dump -U nexa -d nexamarket --format=custom --no-owner --no-acl > "$TEMP"
test -s "$TEMP"
age --encrypt --recipient "$AGE_RECIPIENT" --output "$FINAL" "$TEMP"
sha256sum "$FINAL" > "$FINAL.sha256"
chmod 600 "$FINAL" "$FINAL.sha256"

docker compose --env-file .env -f compose/compose.yaml exec -T postgres pg_dump -U nexa -d keycloak --format=custom --no-owner --no-acl > "$TEMP_KC" || true
if test -s "$TEMP_KC"; then
  age --encrypt --recipient "$AGE_RECIPIENT" --output "$FINAL_KC" "$TEMP_KC"
  sha256sum "$FINAL_KC" > "$FINAL_KC.sha256"
  chmod 600 "$FINAL_KC" "$FINAL_KC.sha256"
fi
echo "BACKUP_CREATED: $FINAL (encrypted; verify off-site copy separately)"
