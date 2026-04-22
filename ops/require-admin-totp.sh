#!/usr/bin/env bash
# Must be run BEFORE promoting an admin to the NestJS authorization role.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a;source .env;set +a
: "${KEYCLOAK_USER_ID:?Set the verified Keycloak user ID from the admin console}"
: "${KEYCLOAK_ADMIN_USERNAME:?}"; : "${KEYCLOAK_ADMIN_PASSWORD:?}"
KC=(docker compose --env-file .env -f compose/compose.yaml exec -T keycloak /opt/keycloak/bin/kcadm.sh)
"${KC[@]}" config credentials --server http://localhost:8080/identity --realm master --user "$KEYCLOAK_ADMIN_USERNAME" --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null
"${KC[@]}" update "users/$KEYCLOAK_USER_ID" -r nexamarket -s 'requiredActions=["CONFIGURE_TOTP"]'
echo 'TOTP required action assigned. Verify completion and revoke pre-existing sessions before app admin promotion.'
