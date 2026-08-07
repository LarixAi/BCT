# Play Console — Data safety (Veyvio Yard)

**Status:** Scaffold for Gate 3 — MDM-first distribution; complete before any public Play listing  
**App:** `uk.veyvio.yard` (Veyvio Yard)  
**Listing posture (28 Jul 2026):** **MDM / private distribution first** — workforce depot app; public Play only if unmanaged BYOD is required later  
**Authority:** [gate3-store-readiness.md](./gate3-store-readiness.md)  

---

## Store URLs

| Field | URL |
|-------|-----|
| Privacy policy | https://veyvio.co.uk/legal/product-privacy |
| Terms | https://veyvio.co.uk/legal/terms |
| Support | https://veyvio.co.uk/support · support@veyvio.co.uk |

---

## 1. Data collection summary (current Android shell)

| Data type | Collected | Shared | Purpose | Required |
|-----------|-----------|--------|---------|----------|
| Name / email | Yes (via Command auth) | No | Staff identity, company membership | Yes |
| Photos | Yes when camera/upload used for defects / evidence | No | Defect and condition evidence | Feature |
| Precise location | Not declared in Yard Android manifest today | — | — | No |
| Device IDs / push | Not used (no FCM for Yard yet) | — | — | No |

**Not collected:** contacts, financial info, advertising IDs.

---

## 2. Permissions ↔ behaviour

| Permission | Status (28 Jul 2026) | Notes |
|------------|---------------------|-------|
| `INTERNET` | Declared | Sync with Command API |
| `CAMERA` | Declared (28 Jul 2026) | Defect evidence / QR on physical devices |
| Location / background location | **Not declared** | Do not add unless product requires yard GPS |
| Push / FCM | **Not configured** | No `google-services.json` for Yard |

---

## 3. Security practices

- Data encrypted in transit: **Yes** (HTTPS to Supabase / Command)
- Users can request deletion: via operator / company admin + product privacy notice
- Independent security review: **No** until Gate 4

---

## 4. Operator checklist

- [x] Listing posture decided: MDM-first (28 Jul 2026)
- [x] CAMERA declared in AndroidManifest (28 Jul 2026) — confirm runtime prompt on device
- [ ] Release signing / internal AAB if Play private track used
- [ ] Paste privacy / support URLs into Play or MDM catalog
- [x] About screen version matches `versionName` (1.0); distribution labelled MDM (28 Jul 2026)

---

## Related

- Android: `android/app/src/main/AndroidManifest.xml`
- Product privacy: https://veyvio.co.uk/legal/product-privacy
- Driver counterpart: [play-data-safety-driver.md](./play-data-safety-driver.md)
