#!/usr/bin/env bash
set -Eeuo pipefail
: "${BASE_URL:?Specify https://your-production-domain}"
if [[ ! "$BASE_URL" =~ ^https:// ]]; then echo 'Require HTTPS smoke target' >&2;exit 1;fi
for path in /health/live /health/ready /api/v1/categories /api/v1/settings/theme /; do
  code="$(curl --connect-timeout 3 --max-time 15 --silent --output /dev/null --write-out '%{http_code}' "$BASE_URL$path")"
  if [[ "$code" != 200 ]]; then echo "FAIL: $path HTTP $code" >&2;exit 1;fi
  echo "PASS: GET $path HTTP $code"
done
code="$(curl --connect-timeout 3 --max-time 15 --silent --output /dev/null --write-out '%{http_code}' "$BASE_URL/api/v1/me/addresses")"
[[ "$code" == 401 ]] || { echo "FAIL: anonymous account API HTTP $code" >&2; exit 1; }
echo 'PASS: anonymous account access denied.'
