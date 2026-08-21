# Play Console — Data safety (Veyvio Driver)

**Status:** Scaffold for Gate 3 — complete in Play Console before internal track release  
**App:** `uk.veyvio.driver` (Veyvio Driver)  
**Authority:** [gate3-store-readiness.md](./gate3-store-readiness.md) §5.3  
**Updated:** 28 Jul 2026 — background location removed from manifest  

---

## Store URLs (paste into Play / App Store Connect)

| Field | URL |
|-------|-----|
| Privacy policy | https://veyvio.co.uk/legal/product-privacy |
| Terms (website) | https://veyvio.co.uk/legal/terms |
| Support | https://veyvio.co.uk/support |
| Support email | support@veyvio.co.uk |

---

## 1. Data collection summary

| Data type | Collected | Shared | Purpose | Required |
|-----------|-----------|--------|---------|----------|
| Name | Yes | No | Driver identity, duty assignment | Yes |
| Email address | Yes | No | Sign-in, company membership | Yes |
| Phone number | Optional | No | Emergency contact / ops comms | No |
| Precise location | Yes (when in use) | No | Duty tracking, parking, journey progress | Yes for duty |
| Photos / videos | Yes | No | Vehicle checks, defect/incident evidence | No (feature) |
| App activity (duty events) | Yes | No | Operational audit, dispatch visibility | Yes |
| Device or other IDs | Yes (push token) | No | Duty-change notifications | No (feature) |
| Crash logs | Optional (if enabled) | No | Stability | No |

**Not collected:** contacts, financial info, health info, messages between users outside ops comms, browsing history.

---

## 2. Security practices (form answers)

- Data encrypted in transit: **Yes** (HTTPS / TLS to Supabase + Command API)
- Users can request data deletion: **Yes** (via operator / company admin — document support URL)
- Data deletion policy published: **Yes** — https://veyvio.co.uk/legal/product-privacy
- Independent security review: **No** (until pen test complete — Gate 4)

---

## 3. Location declaration

| Question | Answer |
|----------|--------|
| Approximate location | No (unless product adds coarse-only mode) |
| Precise location | Yes — when driver is on duty or submitting location-tagged evidence |
| Background location | **No** — `ACCESS_BACKGROUND_LOCATION` removed from manifest (28 Jul 2026) |
| Foreground service | Yes — navigation return bubble uses `FOREGROUND_SERVICE_SPECIAL_USE` only (not location FGS) |

**Operational copy for reviewers:** Location is used to show dispatch where the vehicle is on active duty and to attach location to safety reports. It is not sold or used for advertising. The app does not collect location in the background.

---

## 4. Permissions ↔ behaviour matrix

| Permission | User-facing reason | Data safety category |
|------------|-------------------|----------------------|
| `CAMERA` | Walkaround / defect photos | Photos |
| `READ_MEDIA_IMAGES` | Attach existing photos | Photos |
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Duty map + parking (when in use) | Location |
| `POST_NOTIFICATIONS` | Duty published / compliance alerts | App activity |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_SPECIAL_USE` | Floating return button while in Maps | — |
| `SYSTEM_ALERT_WINDOW` | Floating return bubble overlay | — |
| `INTERNET` | Sync with Command | — |

**Not declared:** `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`.

---

## 5. Third parties

| Party | Role | Data shared |
|-------|------|-------------|
| Supabase | Auth, database, storage | Account + operational records per tenant |
| Firebase Cloud Messaging | Push delivery | Device token only |
| Map provider (if embedded) | Map tiles | No PII in standard SDK usage |

No ad networks. No data brokers.

---

## 6. Operator checklist (before internal track)

- [ ] Privacy policy URL live and linked in Play Console (`/legal/product-privacy`)
- [ ] Support email / URL matches App Store / Play listing
- [ ] Data safety form answers match **actual** manifest permissions
- [x] Background location removed (28 Jul 2026)
- [ ] `google-services.json` injected in CI — not committed if policy requires
- [ ] Screenshot of in-app sync / offline state available for review if asked

---

## 7. Related files

- Android manifest: `veyvio-driver-App/android/app/src/main/AndroidManifest.xml`
- Version bump: [driver-version-bump.md](./driver-version-bump.md)
- iOS privacy: `veyvio-driver-App/ios/App/App/PrivacyInfo.xcprivacy`
- Product privacy page: `veyvio-website/src/content/legal-pages.ts` → `/legal/product-privacy`
