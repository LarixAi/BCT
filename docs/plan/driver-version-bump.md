# Driver app — version bump process

**Status:** Gate 3 scaffold  
**Apps:** Android (`versionCode` / `versionName`) + iOS (`CURRENT_PROJECT_VERSION` / `MARKETING_VERSION`)

---

## Semantic versioning

| Field | Android | iOS | Rule |
|-------|---------|-----|------|
| User-visible | `versionName` | `MARKETING_VERSION` | `MAJOR.MINOR.PATCH` — e.g. `1.0.0` |
| Store integer | `versionCode` | `CURRENT_PROJECT_VERSION` | Monotonic integer — **must increase every upload** |

**Current baseline (25 Jul 2026):** `1.0` / code `1`

---

## Bump script

From repo root:

```bash
node veyvio-driver-App/scripts/bump-driver-version.mjs patch
# or: minor | major | --set 1.2.0 --code 12
```

Updates:

- `veyvio-driver-App/android/app/build.gradle`
- `veyvio-driver-App/ios/App/App.xcodeproj/project.pbxproj` (Debug + Release)

---

## Release checklist

1. Run tests: `cd veyvio-driver-App && npm test`
2. Bump version (script above)
3. Verify production env: no `VITE_MOCK_API`, no `VITE_DRIVER_NAV_TEST_MODE`
4. Android: `cd veyvio-driver-App/android && ./gradlew bundleRelease`
5. iOS: Archive in Xcode → App Store Connect
6. Tag: `driver-v1.0.1` (match `MARKETING_VERSION`)
7. Update [gate3-store-readiness.md](./gate3-store-readiness.md) inventory table

---

## CI recommendation (partial scaffold — 28 Jul 2026)

Implemented:

- Env-injected `signingConfigs.release` in `veyvio-driver-App/android/app/build.gradle` (`VEYVIO_UPLOAD_*`)
- Workflow [`.github/workflows/driver-android-aab.yml`](../../.github/workflows/driver-android-aab.yml) — `workflow_dispatch` + `driver-v*` tags; fails if upload secrets missing; keeps `VITE_ENABLE_PUSH=false` until device-proven
- CI already runs `verify:production-build` on Driver (blocks mock / Base44 / PHV / nav test mode)

Still operator:

- Add GitHub secrets: `VEYVIO_UPLOAD_KEYSTORE_BASE64`, `VEYVIO_UPLOAD_STORE_PASSWORD`, `VEYVIO_UPLOAD_KEY_ALIAS`, `VEYVIO_UPLOAD_KEY_PASSWORD`
- Upload AAB to Play internal track (API or Console)
- iOS Archive → TestFlight via `xcodebuild` / Fastlane
