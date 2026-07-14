#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/icons/icon-1024.png"
RES="$ROOT/android/app/src/main/res"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source icon: $SRC"
  exit 1
fi

make_solid_splash() {
  local width="$1"
  local height="$2"
  local out="$3"
  local tmp
  tmp="$(mktemp -t veyvio-splash.XXXXXX.png)"
  sips -z 4 4 "$SRC" --out "$tmp" >/dev/null
  mkdir -p "$(dirname "$out")"
  sips --padColor 0B1526 --padToHeightWidth "$height" "$width" "$tmp" --out "$out" >/dev/null
  rm -f "$tmp"
}

# Default + orientation-specific Capacitor splash assets (Veyvio Midnight fill).
make_solid_splash 480 320 "$RES/drawable/splash.png"
make_solid_splash 320 480 "$RES/drawable-port-mdpi/splash.png"
make_solid_splash 480 800 "$RES/drawable-port-hdpi/splash.png"
make_solid_splash 720 1280 "$RES/drawable-port-xhdpi/splash.png"
make_solid_splash 960 1600 "$RES/drawable-port-xxhdpi/splash.png"
make_solid_splash 1280 1920 "$RES/drawable-port-xxxhdpi/splash.png"
make_solid_splash 480 320 "$RES/drawable-land-mdpi/splash.png"
make_solid_splash 800 480 "$RES/drawable-land-hdpi/splash.png"
make_solid_splash 1280 720 "$RES/drawable-land-xhdpi/splash.png"
make_solid_splash 1600 960 "$RES/drawable-land-xxhdpi/splash.png"
make_solid_splash 1920 1280 "$RES/drawable-land-xxxhdpi/splash.png"

echo "Android splash screens generated (midnight #0B1526)"
