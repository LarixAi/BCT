# Gate 3 — TestFlight archive runbook

**Prerequisite:** [gate1-ios-xcode-runbook.md](./gate1-ios-xcode-runbook.md) device run succeeds  
**Bundle:** `uk.veyvio.driver`

---

## CI path (PROD-6)

Fail-closed workflow: `.github/workflows/driver-ios-ipa.yml`

1. Requires production GitHub Environment vars (same as Android AAB).
2. Runs `assert-ios-release-ready` + `assert-release-config`.
3. Requires Apple signing secrets (`VEYVIO_APPLE_*`). Without them the job **fails closed** (no demo IPA).
4. Archive/export via Xcode remains operator-owned until keychain import is wired; use this runbook for the first TestFlight upload.

Scaffold: `veyvio-driver-App/ios/ExportOptions.plist` (replace team ID + profile name).

## Archive steps

```bash
cd veyvio-driver-App
npm run build:ios
open ios/App/App.xcworkspace
```

1. Select **Any iOS Device (arm64)** as destination (not Simulator).
2. **Product → Archive**.
3. When Organizer opens → **Distribute App** → **App Store Connect** → **Upload**.
4. Wait for processing in App Store Connect → **TestFlight** tab.

---

## App Store Connect (operator)

1. Create app record **Veyvio Driver** with bundle `uk.veyvio.driver`.
2. Paste privacy URL: https://veyvio.co.uk/legal/product-privacy  
3. Paste terms URL: https://veyvio.co.uk/legal/terms  
4. Support URL: https://veyvio.co.uk/support  
5. Add internal testers (pilot ops + driver accounts).

---

## Before public TestFlight

- [ ] Gate 1 iOS physical checklist signed ([`.gate1-handset-ios.local.md`](./.gate1-handset-ios.local.md))
- [ ] APNs configured ([gate3-apns-ios-setup.md](./gate3-apns-ios-setup.md))
- [ ] Screenshots captured ([driver-store-listing-draft.md](./driver-store-listing-draft.md))
