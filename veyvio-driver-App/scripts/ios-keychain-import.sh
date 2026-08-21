#!/usr/bin/env bash
# PROD-6 — import Apple distribution cert + profile into a temporary keychain.
# Expects env (from GitHub secrets):
#   VEYVIO_APPLE_CERTIFICATE_BASE64
#   VEYVIO_APPLE_CERTIFICATE_PASSWORD
#   VEYVIO_APPLE_PROVISIONING_PROFILE_BASE64
#   VEYVIO_APPLE_TEAM_ID
# Optional:
#   VEYVIO_APPLE_PROVISIONING_PROFILE_NAME  (rewrites ExportOptions.plist)
#   VEYVIO_IOS_EXPORT_OPTIONS              (path, default ios/ExportOptions.plist)
#
# Does not archive; leaves keychain ready for xcodebuild.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPORT_PLIST="${VEYVIO_IOS_EXPORT_OPTIONS:-$ROOT/ios/ExportOptions.plist}"
KEYCHAIN_PATH="${RUNNER_TEMP:-/tmp}/veyvio-ios-signing.keychain-db"
KEYCHAIN_PASSWORD="${VEYVIO_IOS_KEYCHAIN_PASSWORD:-veyvio-ci-temp}"

: "${VEYVIO_APPLE_CERTIFICATE_BASE64:?missing VEYVIO_APPLE_CERTIFICATE_BASE64}"
: "${VEYVIO_APPLE_CERTIFICATE_PASSWORD:?missing VEYVIO_APPLE_CERTIFICATE_PASSWORD}"
: "${VEYVIO_APPLE_PROVISIONING_PROFILE_BASE64:?missing VEYVIO_APPLE_PROVISIONING_PROFILE_BASE64}"
: "${VEYVIO_APPLE_TEAM_ID:?missing VEYVIO_APPLE_TEAM_ID}"

CERT_PATH="${RUNNER_TEMP:-/tmp}/veyvio-dist.p12"
PROFILE_PATH="${RUNNER_TEMP:-/tmp}/veyvio-dist.mobileprovision"

echo "$VEYVIO_APPLE_CERTIFICATE_BASE64" | base64 --decode > "$CERT_PATH"
echo "$VEYVIO_APPLE_PROVISIONING_PROFILE_BASE64" | base64 --decode > "$PROFILE_PATH"

security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

security import "$CERT_PATH" -P "$VEYVIO_APPLE_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k "$KEYCHAIN_PATH"
security list-keychain -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | sed -e s/\"//g)
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
PROFILE_UUID=$(grep -aAoE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}' "$PROFILE_PATH" | head -1 || true)
if [ -z "${PROFILE_UUID:-}" ]; then
  PROFILE_UUID="veyvio-ci-profile"
fi
cp "$PROFILE_PATH" "$HOME/Library/MobileDevice/Provisioning Profiles/${PROFILE_UUID}.mobileprovision"

# Rewrite ExportOptions placeholders from env when present.
if [ -f "$EXPORT_PLIST" ]; then
  PROFILE_NAME="${VEYVIO_APPLE_PROVISIONING_PROFILE_NAME:-$PROFILE_UUID}"
  /usr/bin/sed -i.bak \
    -e "s/REPLACE_WITH_APPLE_TEAM_ID/${VEYVIO_APPLE_TEAM_ID}/g" \
    -e "s/REPLACE_WITH_DISTRIBUTION_PROFILE_NAME/${PROFILE_NAME}/g" \
    "$EXPORT_PLIST"
  rm -f "${EXPORT_PLIST}.bak"
fi

echo "ios-keychain-import: ready keychain=$KEYCHAIN_PATH team=$VEYVIO_APPLE_TEAM_ID"
