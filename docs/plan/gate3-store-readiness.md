# Gate 3 — Store readiness checklist

**Status:** Android push live-verified (28 Jul 2026)  
**Tracks (split):**

| Track | Status | Blocker |
|-------|--------|---------|
| **Play internal (Android)** | In progress | Paste upload keystore secrets into CI — [gate3-ci-keystore-secrets.md](./gate3-ci-keystore-secrets.md) |
| **App Store / TestFlight (iOS)** | Blocked | Gate 1 iOS physical sign-off — [gate1-ios-xcode-runbook.md](./gate1-ios-xcode-runbook.md) |

**Prerequisite for public store submit:** [gate1-operator-physical-runbook.md](./gate1-operator-physical-runbook.md) signed for both platforms; Gate 2 compliance minimum for BCT.  
**Android-only BCT pilot** may run without store submit — [bct-pilot-live-shift-runbook.md](./bct-pilot-live-shift-runbook.md).  
**Authority:** Combined Blueprint Part F stop-ship + [veyvio-production-gates.md](./veyvio-production-gates.md) §5  

---

## Current inventory (28 Jul 2026)

| Item | Android | iOS | Notes |
|------|---------|-----|-------|
| Application id / bundle | `uk.veyvio.driver` ✓ | `uk.veyvio.driver` ✓ (code) | Recreate Apple App ID / provisioning for this bundle |
| Display name | Veyvio Driver ✓ | Veyvio Driver ✓ | Aligned |
| Auth URL scheme | `uk.veyvio.driver` ✓ | `uk.veyvio.driver` ✓ | Supabase `uri_allow_list` includes `uk.veyvio.driver://**` (28 Jul 2026) |
| Privacy manifest | Play data safety scaffold ✓ | `PrivacyInfo.xcprivacy` scaffold ✓ | Required Reason APIs noted; re-review before submit |
| Camera / location usage strings | Manifest permissions | Info.plist strings ✓ | Face ID + camera + photos + when-in-use location |
| Background location | Removed ✓ | Not requested ✓ | When-in-use only |
| Push | FCM live on handset ✓ | Needs APNs key + entitlements | Duty published delivered 28 Jul 2026 |
| Release signing | Local upload `.jks` generated 28 Jul; CI paste pending | Distribution cert + profile | See [gate3-ci-keystore-secrets.md](./gate3-ci-keystore-secrets.md) |
| Production env | `verify:production-build` ✓ | Same Vite flags | No mock / Base44 / PHV |
| Store legal URLs | Live ✓ | Same | https://veyvio.co.uk/legal/product-privacy |
| Yard listing | MDM-first ✓ | No iOS Yard | See §5.1 Yard + [play-data-safety-yard.md](./play-data-safety-yard.md) |

---

## 5.1 Identity and branding

- [x] Set iOS `PRODUCT_BUNDLE_IDENTIFIER` = `uk.veyvio.driver` in `ios/App/App.xcodeproj/project.pbxproj`
- [ ] Recreate Apple App ID + provisioning for the new bundle (or migrate existing)
- [x] Supabase Auth → Redirect URLs include `uk.veyvio.driver://**` (+ localhost auth paths) — set via Management API 28 Jul 2026 on `qeckgqjrfbdyxchuncdt`
- [x] `CFBundleDisplayName` = `Veyvio Driver`
- [x] Remove Ridova favicon/manifest naming from Driver web shell (`veyvio-favicon.svg`, `manifest.json` “Veyvio Driver”)
- [x] Remove user-facing Ridova / Core Support / legacy scheme strings (28 Jul 2026 — bubble channel, training copy, Nominatim UA, CarPlay `uk.veyvio.driver`, `AUTH_EMAIL_SETUP.md`, operator defaults). CSS `--ridova-*` tokens remain as brand variables until a full theme rename.
- [x] Yard mobile listing decision: **MDM-first / private distribution** for `uk.veyvio.yard` (28 Jul 2026) — public Play only if unmanaged BYOD is required later. No iOS Yard project today.

**Yard (in-repo, 28 Jul 2026)**
- [x] Identity already `uk.veyvio.yard` / Veyvio Yard
- [x] Data safety scaffold — [play-data-safety-yard.md](./play-data-safety-yard.md)
- [x] About screen: version `1.0`, distribution “MDM / operator devices” (was Prototype)
- [x] `CAMERA` declared in Yard AndroidManifest for defect/QR honesty

**Operator TODO**
1. Apple Developer → App ID `uk.veyvio.driver` + provisioning profiles  
2. Add production Driver host to Supabase redirects if/when a hosted Driver URL is used  

---

## 5.2 Release engineering

### Play internal (Android) — may proceed without iOS

- [x] Android `signingConfig` skeleton for `bundleRelease` (env-injected; no secrets in repo) — `veyvio-driver-App/android/app/build.gradle`
- [x] Local upload keystore generated (28 Jul) under `veyvio-driver-App/.secrets/` (gitignored)
- [ ] Android upload keystore stored in CI secrets; produce signed AAB on internal track — [gate3-ci-keystore-secrets.md](./gate3-ci-keystore-secrets.md)
- [x] AAB workflow scaffold — [`.github/workflows/driver-android-aab.yml`](../../.github/workflows/driver-android-aab.yml) (fails without secrets)
- [x] Production Vite flags documented + CI `verify:production-build` (never `VITE_MOCK_API` / `VITE_DRIVER_NAV_TEST_MODE`; keep `VITE_ENABLE_PUSH=false` on release until store/FCM send verified — **debug** builds use `true`)
- [x] Version bump process documented — [driver-version-bump.md](./driver-version-bump.md) + `veyvio-driver-App/scripts/bump-driver-version.mjs`
- [ ] Fastlane or full GitHub Actions → Play upload with live secrets

**Operator TODO (Play)**  
1. Paste `VEYVIO_UPLOAD_*` secrets per [gate3-ci-keystore-secrets.md](./gate3-ci-keystore-secrets.md)  
2. Run **Driver Android AAB** workflow → upload artifact to Play internal  

### App Store / TestFlight (iOS) — blocked on Gate 1 iOS

- [ ] Gate 1 iOS physical sign-off  
- [ ] iOS Archive → App Store Connect TestFlight — [gate3-testflight-archive.md](./gate3-testflight-archive.md)  
- [ ] Fastlane or full GitHub Actions → TestFlight upload with live secrets  

**Operator TODO (App Store)**  
1. Plug in iPhone → [gate1-ios-xcode-runbook.md](./gate1-ios-xcode-runbook.md)  
2. Distribution cert + Archive → TestFlight 

---

## 5.3 Privacy and permissions

### iOS Info.plist / privacy

- [x] `NSCameraUsageDescription` — vehicle checks / defect evidence
- [x] `NSPhotoLibraryUsageDescription` — attach existing photos when needed
- [x] `NSLocationWhenInUseUsageDescription` — duty tracking / parking
- [x] Background location not required — not declared (when-in-use only)
- [x] Add `PrivacyInfo.xcprivacy` scaffold (Required Reason APIs `CA92.1` / `C617.1` noted 28 Jul 2026; re-review before submit)
- [x] Public product privacy + terms + support URLs live:  
  - Privacy: https://veyvio.co.uk/legal/product-privacy  
  - Terms: https://veyvio.co.uk/legal/terms  
  - Support: https://veyvio.co.uk/support · `support@veyvio.co.uk`  
- [ ] Paste those URLs into App Store Connect (operator)

### Android

- [ ] Play Console Data safety form completed
- [x] Play data safety scaffold — [play-data-safety-driver.md](./play-data-safety-driver.md) (aligned with BG location removed)
- [x] Background location / FGS location declarations match real behaviour (removed unused permissions 28 Jul 2026)
- [x] Same privacy/terms/support URLs (live on veyvio.co.uk)
- [ ] Paste URLs + submit Data safety form in Play Console (operator)

**Operator TODO**
1. Complete Play Data safety + App Store Connect privacy fields using [play-data-safety-driver.md](./play-data-safety-driver.md)

---

## 5.4 Push notifications

- [x] Firebase project `veyvio-d3632` → Android app `uk.veyvio.driver` registered; `android/app/google-services.json` refreshed (28 Jul 2026). Old Core Support fleet file backed up as `google-services.core-support-fleet.backup.json`.
- [x] Enable FCM API (`fcm.googleapis.com`) on `veyvio-d3632` (28 Jul 2026 via Google APIs; Cloud Messaging console may still show product onboarding until first send).
- [x] FCM sender SA `veyvio-fcm@veyvio-d3632.iam.gserviceaccount.com` created; JSON key stored as Supabase secret `FCM_SERVICE_ACCOUNT_JSON` on `qeckgqjrfbdyxchuncdt` (28 Jul 2026). Local copy only under `veyvio-driver-App/.secrets/` (gitignored).
- [x] Server send path deployed — migration `202607280001` + `command-api` (28 Jul 2026). Hook after in-app insert in `driver-ops-notifications.ts`.
- [x] Live proof: publish duty `2768607b-…` → in-app `Duty published` + FCM on SM_S948B (`android.title=Duty published` / `Duty published with warnings` in notification shade) — 28 Jul 2026 ~11:02 UTC.
- [x] Push tap routing unit-tested (`notification-router.test.js` → `/jobs` for `duty_published`).
- [x] Manual/automated tap → Driver foreground after **Duty published** — `npm run gate3:push-tap` PASS on SM_S948B (28 Jul 2026). Confirm My Duty (`/jobs`) on device when shade is clear.
- [ ] APNs key in Apple Developer + Xcode capabilities + iOS Firebase app registration
- [x] `VITE_ENABLE_PUSH=true` on local debug builds (keep false on release builds until store listing)

**Operator TODO**
1. On device: after tap, confirm My Duty (`/jobs`) is visible (script proves Driver foreground + shade delivery)  
2. Register iOS Firebase app + APNs — [gate3-apns-ios-setup.md](./gate3-apns-ios-setup.md)  
3. Upload keystore secrets to GitHub Actions (local keystore generated under `veyvio-driver-App/.secrets/` — gitignored): `VEYVIO_UPLOAD_KEYSTORE_BASE64`, `VEYVIO_UPLOAD_STORE_PASSWORD`, `VEYVIO_UPLOAD_KEY_PASSWORD`, `VEYVIO_UPLOAD_KEY_ALIAS=veyvio-driver-upload`

---

## 5.5 Store listing assets

- [x] Short + full description drafts — [driver-store-listing-draft.md](./driver-store-listing-draft.md)
- [x] Feature graphic brief (same doc)
- [ ] Screenshots (phone + optional tablet): home, walkaround, sync, duty — **operator capture on device**
- [ ] Feature graphic produced and uploaded (Play)
- [ ] Age rating / questionnaires
- [ ] Export compliance

**Operator TODO:** Capture screenshots; complete store questionnaires; upload listing assets.

---

## Suggested order (do not skip)

1. Finish Gate 1 iOS physical sign-off *(blocking **App Store** submit — Android Gate 1 already PASS; Android-only pilot may run)*  
2. Unify iOS bundle ID + privacy strings + `PrivacyInfo.xcprivacy` *(code done; Apple App ID + Store Connect still operator)*  
3. Play internal: paste CI keystore secrets → AAB → internal track ([gate3-ci-keystore-secrets.md](./gate3-ci-keystore-secrets.md))  
4. Internal TestFlight *(after iOS Gate 1)* + Play internal testing with pilot drivers  
5. Push keys *(Android FCM live-verified; iOS APNs open)*  
6. Store listing + legal URLs *(live product privacy; console paste + screenshots open)*  
7. Submit → Gate 4 pilot launch matrix  

---

## Out of scope here

- Part C intelligence / digital twin  
- Public marketing site product pages beyond legal URLs  
- Multi-operator self-serve signup (SaaS roadmap)  
- Yard public Play listing (deferred — MDM-first)  
