#!/usr/bin/env bash
# One-time provisioning after Keycloak is available. Requires valid .env and realm import.
# Social providers require operator-supplied credentials and redirect URLs.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a;source .env;set +a
: "${KEYCLOAK_CLIENT_SECRET:?KEYCLOAK_CLIENT_SECRET}"; : "${PUBLIC_URL:?PUBLIC_URL}"; : "${KEYCLOAK_ADMIN_USERNAME:?KEYCLOAK_ADMIN_USERNAME}"; : "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD}"
EXEC="docker compose --env-file .env -f compose/compose.yaml exec -T keycloak /opt/keycloak/bin/kcadm.sh"
# kcadm stores credentials only inside the Keycloak container. Rotate setup credentials afterward.
$EXEC config credentials --server http://localhost:8080/identity --realm master --user "$KEYCLOAK_ADMIN_USERNAME" --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null
cat <<JSON | $EXEC create clients -r nexamarket -f -
{"clientId":"nexamarket-bff","name":"NexaMarket backend confidential OIDC client","enabled":true,"publicClient":false,"clientAuthenticatorType":"client-secret","secret":"$KEYCLOAK_CLIENT_SECRET","standardFlowEnabled":true,"directAccessGrantsEnabled":false,"serviceAccountsEnabled":false,"implicitFlowEnabled":false,"redirectUris":["$PUBLIC_URL/auth/callback"],"webOrigins":["$PUBLIC_URL"],"attributes":{"pkce.code.challenge.method":"S256"},"protocol":"openid-connect"}
JSON
# Re-running the script will return conflict rather than silently modify credentials.
echo 'Created Keycloak BFF client. Configure Google/Facebook identity providers, SMTP and MFA admin policy separately.'
