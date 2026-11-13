#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 5 ]; then
  echo 'Usage: sign-apk.sh UNSIGNED_APK KEYSTORE PASSWORD_FILE APKSIGNER_JAR OUTPUT_APK' >&2
  exit 2
fi
java -jar "$4" sign --ks "$2" --ks-key-alias graue-xps --ks-pass "file:$3" --key-pass "file:$3" --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true --v4-signing-enabled false --out "$5" "$1"
verification=$(java -jar "$4" verify --verbose --print-certs "$5")
printf '%s\n' "$verification"
if ! printf '%s\n' "$verification" | tr -d ':' | grep -qi '0236ff9f602daa3ad99c90b66fcf7bedc363dd511e8d4f2f51b6181081aa127f'; then
  echo 'Unexpected signing certificate; do not distribute this APK.' >&2
  exit 1
fi
