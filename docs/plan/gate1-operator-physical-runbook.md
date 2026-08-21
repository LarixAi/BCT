# Gate 1 — operator physical runbook (BCT)

**Audience:** Ops lead + pilot driver (phone in hand)  
**Companion:** [gate1-pilot-exit-test.md](./gate1-pilot-exit-test.md) (full matrix) · [gate3-store-readiness.md](./gate3-store-readiness.md) (after this passes)  
**Do not start Gate 3 store submit until this runbook is signed for Android + iOS.**

---

## 0. Before you touch a phone (5 minutes)

From repo root:

```bash
# Live API path shared by Android + iOS (must be green)
npm run gate1:device-exit -- --skip-build

# Optional: install + airplane cycle on a plugged-in Android
npm run gate1:device-handset

# Print what is still manual
npm run gate1:operator-status
```

| Account | Where |
|---------|--------|
| Pilot driver | `pilot-driver@veyvio.test` — password in `.gate1-secrets.local.env` |
| Vehicle | **BX62 BCT** (BCT pilot seed) |
| Driver web (fallback) | https://veyvio-driver.pages.dev |
| Yard | https://larixai-bct.larixai-veyvio.workers.dev |
| Command | https://veyvio-admin.pages.dev |

Hard-refresh each site / reinstall APK so you are not on a stale build.

---

## 1. Android — remaining UI rows (handset)

Automated already: login launch, airplane adb on/off, production APK install (`gate1:device-handset`).  
Complete these on the phone and tick the sign-off table at the bottom.

### A. Sync centre honest queue (row 2)

1. Unlock fingerprint (or “Use password instead”) on the handset.
2. Open Driver → **More → Sync**, or deep link `uk.veyvio.driver:///sync`.
3. Confirm pending count is **0** / “Pending offline queue · none” when online and idle.
4. Enable airplane mode → start a walkaround answer (do not finish) or queue a message draft.
5. Sync centre pending count must **increase** (never stay stuck at 0 while actions are queued).
6. Disable airplane → wait for sync → count returns to **0**; no “synced” without a server acknowledgement time.

**Automated help:** `npm run gate1:device-handset` installs APK, toggles airplane, and opens Sync via deep link (must unlock biometrics first).

**Fail if:** Sync shows 0 while the queue still lists pending items.

### B. Airplane mid-walkaround (row 3 — UI half)

adb already toggled radio. On device:

1. Start vehicle check → airplane ON mid-flow → finish / submit offline.
2. Sync centre shows pending check + media.
3. Airplane OFF → check appears in Command vehicle timeline / history.

### C. Bodywork defect → Yard (row 6)

1. On Driver: report **bodywork** damage with a photo on BX62 BCT.
2. Within 60s open Yard hub (same BCT company).
3. Pass: damage / inspect task visible **without** re-typing in Admin.

API backup (same chain): `gate1:device-exit` now posts a bodywork defect and verifies a Yard `inspect_damage` task when admin creds are available.

### D. Handback + parking (row 7)

1. End of shift flow: handback → bay / keys → submit.
2. Command vehicle timeline shows handback; Yard map/bay updates for that reg.

### E. Native push tap (row 9 — optional if push not enabled)

1. From Command, publish / change a duty for the pilot.
2. Driver receives **in-app** notification (required). Push tap is bonus until Gate 3 Firebase/APNs.

### F. Sequential company login (row 10 — UI)

1. If the pilot has a second membership, sign out → sign into the other company.
2. Sync queue and home must show **zero** BCT cache bleed.

---

## 2. iOS — full physical column

No iOS device was attached in the engineering environment. Use a physical iPhone (not only Simulator for airplane / camera).

| Prep | Notes |
|------|--------|
| Bundle ID today | Xcode still has `com.coresupport.fleet.driver` — **Gate 3** unifies to `uk.veyvio.driver` (see store checklist). For this pilot, install whatever scheme your team already uses. |
| Display name | Target: **Veyvio Driver** (aligned with Android). |
| Build | `cd veyvio-driver-App && npx cap sync ios` then open Xcode → run on device. |
| Auth scheme | URL scheme `uk.veyvio.driver` must match Supabase redirect allow-list. |

Walk every row in [gate1-pilot-exit-test.md](./gate1-pilot-exit-test.md) § Physical device checklist **iOS** column (1–11).  
Backend rows (1, 4–5, 8–11) are already proven by `gate1:device-exit`; still confirm UI copy and camera/offline feel on iOS.

Generate a blank iOS sign-off sheet:

```bash
npm run gate1:ios-checklist
# writes docs/plan/.gate1-handset-ios.local.md (gitignored pattern *.local.md)
```

---

## 3. Sign-off (copy into exit test)

| Platform | Device model | OS | App build | Date | Ops lead | Result |
|----------|--------------|----|-----------|------|----------|--------|
| Android | Samsung R5GL13DVHCH | | uk.veyvio.driver | | | ☐ Pass / ☐ Fail |
| iOS | | | | | | ☐ Pass / ☐ Fail |

**Android-only BCT pilot:** Engineering rows are signed in [`.gate1-handset-android.local.md`](./.gate1-handset-android.local.md). Ops lead completes the **Ops lead sign-off** block there after one live shift ([bct-pilot-live-shift-runbook.md](./bct-pilot-live-shift-runbook.md)). That unlocks supervised Android pilot — it does **not** unlock store submit.

When **both** Android + iOS pass, update:

1. `veyvio-production-gates.md` §3.1 — pilot date + company  
2. `veyvio-blueprint-alignment-plan.md` — Gate 1 iOS / manual UI → Done (ops)  
3. Only then open Gate 3 **App Store** submit in earnest (Play internal may proceed on Android — see [gate3-store-readiness.md](./gate3-store-readiness.md))  

---

## 4. Stop-ship during the run

- Sync shows 0 but queue has items  
- Sign-on succeeds when server returns blocked  
- Yard never sees driver bodywork defect  
- Cross-tenant data after company switch  
- Production build still loads Base44 / mock paths  
