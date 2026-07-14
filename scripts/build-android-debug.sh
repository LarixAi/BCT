#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -x "$ROOT/.jdk/temurin-21/Contents/Home/bin/java" ]]; then
    export JAVA_HOME="$ROOT/.jdk/temurin-21/Contents/Home"
  elif [[ -x "$ROOT/.jdk/temurin-17/Contents/Home/bin/java" ]]; then
    export JAVA_HOME="$ROOT/.jdk/temurin-17/Contents/Home"
  elif command -v /usr/libexec/java_home >/dev/null 2>&1; then
    JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || true)"
    [[ -n "$JAVA_HOME" ]] && export JAVA_HOME
  fi
  if [[ -z "${JAVA_HOME:-}" ]]; then
    for candidate in \
      "/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home" \
      "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home" \
      "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
      "$HOME/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"
    do
      if [[ -x "$candidate/bin/java" ]]; then
        export JAVA_HOME="$candidate"
        break
      fi
    done
  fi
fi

if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME}/bin/java" ]]; then
  echo "JDK 17 not found. Install Temurin 17: https://adoptium.net/"
  echo "Then set JAVA_HOME and rerun."
  exit 1
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

npm run cap:sync
cd android
./gradlew assembleDebug
echo ""
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
