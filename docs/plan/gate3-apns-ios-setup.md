# Gate 3 — iOS APNs + Firebase setup

**Prerequisite:** Apple Developer account + Firebase project `veyvio-d3632`  
**Bundle ID:** `uk.veyvio.driver`

---

## 1. Apple Developer

1. **Identifiers** → App IDs → create or confirm `uk.veyvio.driver`.
2. Enable **Push Notifications** capability on the App ID.
3. **Keys** → create **APNs Auth Key** (.p8) — note Key ID and Team ID.
4. Store `.p8` securely (never commit).

---

## 2. Xcode

1. Open `veyvio-driver-App/ios/App/App.xcworkspace`.
2. **App** target → **Signing & Capabilities** → **+ Capability** → **Push Notifications**.
3. Add **Background Modes** → **Remote notifications** if required by Capacitor push plugin.

---

## 3. Firebase Console

1. Project **veyvio-d3632** → Add app → **iOS**.
2. Bundle ID: `uk.veyvio.driver`.
3. Download `GoogleService-Info.plist` → place in `veyvio-driver-App/ios/App/App/` (gitignored or env-specific — do not overwrite Android config).
4. **Project settings → Cloud Messaging** → upload APNs Auth Key (.p8), Key ID, Team ID.

---

## 4. Verify on device

1. Install from Xcode on physical iPhone.
2. Accept notification permission.
3. Publish duty from Command → in-app + push shade delivery.
4. Tap notification → must open **My Duty** (`/jobs`).

---

## Related

- Android FCM: [gate3-store-readiness.md](./gate3-store-readiness.md) §5.4  
- Push routing tests: `veyvio-driver-App/src/lib/notifications/notification-router.test.js`
