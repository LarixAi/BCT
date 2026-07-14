#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/icons/icon-1024.png"
RES="$ROOT/android/app/src/main/res"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source icon: $SRC"
  exit 1
fi

# Adaptive icons crop ~18% from edges — keep logo in the center 66% safe zone.
make_padded_icon() {
  local target_size="$1"
  local out="$2"
  local inner=$(( target_size * 66 / 100 ))
  local tmp
  tmp="$(mktemp -t veyvio-icon.XXXXXX.png)"
  sips -z "$inner" "$inner" "$SRC" --out "$tmp" >/dev/null
  sips --padColor 0B1526 --padToHeightWidth "$target_size" "$target_size" "$tmp" --out "$out" >/dev/null
  rm -f "$tmp"
}

generate() {
  local folder="$1"
  local launcher_size="$2"
  local foreground_size="$3"
  local out="$RES/$folder"
  mkdir -p "$out"
  make_padded_icon "$launcher_size" "$out/ic_launcher.png"
  make_padded_icon "$launcher_size" "$out/ic_launcher_round.png"
  make_padded_icon "$foreground_size" "$out/ic_launcher_foreground.png"
}

generate mipmap-mdpi 48 108
generate mipmap-hdpi 72 162
generate mipmap-xhdpi 96 216
generate mipmap-xxhdpi 144 324
generate mipmap-xxxhdpi 192 432

# Android 12+ splash animated icon (fits circular mask).
make_padded_icon 432 "$RES/drawable/splash_icon.png"

echo "Android launcher icons generated (66% safe zone) from $SRC"
