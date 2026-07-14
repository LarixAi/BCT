## Prerequisites

1. **JDK 17** — required to compile the Android APK  
   Install [Eclipse Temurin 17](https://adoptium.net/) or Android Studio (includes a JDK).
2. **Android SDK** — already at `~/Library/Android/sdk` on this machine.
3. **Phone** — enable **Developer options → USB debugging**, connect via USB.

Set Java for terminal builds (adjust path if needed):

```bash
export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

## Build & install debug APK

```bash
npm run android:run
```

This will:

1. Build the mobile SPA (`dist/client/client`)
2. Sync assets into the Capacitor Android project
3. Run `./gradlew assembleDebug`
4. Install `app-debug.apk` on the connected phone via `adb`

Manual steps:

```bash
npm run cap:sync          # build + copy web bundle
npm run android:debug     # compile APK
npm run android:install   # adb install
```

Open in Android Studio (if you prefer GUI builds):

```bash
npm run cap:open:android
```

## What the mobile build does

- **SPA mode** — static shell for offline use in the WebView
- **Mock API** — `VITE_USE_MOCK_API=true` (fixtures + IndexedDB, no backend)
- **Auth bypass** — `VITE_DEV_BYPASS_AUTH=true` for device testing

Production mobile builds should remove auth bypass and point `VITE_API_BASE_URL` at your real API.

## Quick test without APK (same Wi‑Fi)

If Java isn’t installed yet, test in the phone browser:

```bash
npm run dev:phone
```

Then on your phone open `http://<your-mac-ip>:8080` (shown in the terminal).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Unable to locate a Java Runtime` | Install JDK 17 and set `JAVA_HOME` |
| `adb: no devices` | Enable USB debugging; accept the trust prompt on the phone |
| `INSTALL_FAILED` | Uninstall an older debug build, then retry |
| Blank WebView | Run `npm run cap:sync` after code changes |
