# BCT pilot — live shift runbook (Android)

**Audience:** Ops lead + pilot driver  
**Scope:** One supervised shift on **Android** with Command + Yard as the only operational record  
**Prerequisite:** Gate 1 Android handset rows signed ([`.gate1-handset-android.local.md`](./.gate1-handset-android.local.md))  
**Companion:** [gate1-operator-physical-runbook.md](./gate1-operator-physical-runbook.md)

**Rule:** No parallel spreadsheet. If it is not in Command or Yard, it did not happen for the pilot.

---

## Accounts and surfaces

| Role | Where |
|------|--------|
| Pilot driver | `pilot-driver@veyvio.test` — password in `.gate1-secrets.local.env` · package `uk.veyvio.driver` |
| Vehicle | **BX62 BCT** |
| Command | https://veyvio-admin.pages.dev |
| Yard | https://larixai-bct.larixai-veyvio.workers.dev (or current BCT Yard deploy) |

Hard-refresh / reinstall so builds match the signed Gate 1 APK.

---

## Shift sequence

### 1. Morning — publish (Command)

1. Ops lead signs into Command as BCT.
2. Confirm or create today’s duty for the pilot on **BX62 BCT**.
3. **Publish** the duty.
4. Pass: Driver gets in-app “Duty published” (push shade optional; already verified on Android).

### 2. Driver — acknowledge + readiness

1. Unlock Driver (biometrics or password).
2. Open **My Duty** / jobs → acknowledge published duty if required.
3. Confirm vehicle and readiness (docs / checks as shown).
4. Fail if: duty missing, wrong company, or sync stuck with pending while online idle.

### 3. Walkaround → sign-on

1. Complete vehicle check on BX62 BCT (photo evidence where required).
2. Sign on only when the server allows it.
3. Fail if: sign-on succeeds when Command shows blocked, or Sync shows `0` while queue still has items.

### 4. On duty — jobs and exceptions

1. Run the published job / stops as shown in Driver.
2. If bodywork damage is found: report with photo from Driver.
3. Within 60s open Yard → confirm inspect / damage follow-up for that reg **without** re-typing in Admin.
4. Fail if: Yard never sees the defect, or ops must copy into a sheet.

### 5. Handback + close

1. End of shift: handback → bay / keys → submit.
2. Command vehicle timeline shows handback; Yard bay/map reflects the reg.
3. Sync centre idle pending = **0**.

### 6. Ops verification (same day)

| Check | Pass |
|-------|------|
| Duty published + acknowledged | Visible in Command |
| Walkaround / check | On vehicle timeline |
| Bodywork (if any) | Yard task without spreadsheet |
| Handback | Command + Yard agree on bay |
| No parallel sheet used | Ops lead confirms |

---

## Stop-ship (abort the shift)

- Sync shows 0 but queue still lists pending items  
- Sign-on succeeds when server returns blocked  
- Yard never sees driver bodywork defect  
- Production build still loads mock / Base44 paths  
- Cross-tenant data after any company switch  

---

## After a clean shift

1. Ops lead completes the sign-off block in [`.gate1-handset-android.local.md`](./.gate1-handset-android.local.md).
2. Run `npm run gate1:operator-status` — expect `Ops lead Android: PASS`.
3. Android-only BCT pilot may continue under supervision.
4. iOS physical + Gate 3 store submit remain separate (see [gate3-store-readiness.md](./gate3-store-readiness.md)).

---

## Related

- Live-shift acceptance feeds Gate 4: [gate4-second-tenant-entry.md](./gate4-second-tenant-entry.md)  
- Push tap verify: `cd veyvio-driver-App && npm run gate3:push-tap`
