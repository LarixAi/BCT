# Gate 2 WIP triage (28 Jul 2026)

Status of in-repo Gate 2 paths after **deploy verify** (migrations up to date, `command-api` redeployed, live smokes).

| Workstream | Status | Evidence / next step |
|------------|--------|----------------------|
| FCM server send | **Verified (prod)** | migration `202607280001`, `fcm-send.ts`, live duty publish + shade 28 Jul |
| Job execution bridge | **Verified (prod)** | `test:gate2-live` PASS; tenant-isolation job execution cross-tenant deny |
| Duty closeout | **Verified (prod)** | `test:gate2-live` + tenant-isolation closeout deny; handler returns proper HttpError status |
| Vehicle swap workflow | **Verified (prod)** | live list wired; cross-tenant approve denied |
| Incident workflow metadata | **Verified (prod)** | `test:gate2-live` incidents hub + acknowledge/escalate validation |
| Attendance empty hub | **Park (Gate 2)** | `attendance-empty-hub.ts` fail-closed in Admin `real-client.ts` — wire when attendance hub ships |
| Body-condition empty hub | **Closed for report slice** | Yard `ReportDamageWizard` steps 1–5 + `damage.report` outbox → `applyBodyConditionYardMutation` |
| Gate 2 RLS policies | **Verified (deployed)** | migration `202607270001` already applied (`db push` up to date); `test:tenant-isolation` PASS |

**Deploy evidence (28 Jul 2026):** `supabase db push` (up to date) → `command-api` deploy → `npm run test:gate2-live` PASS → `npm run test:tenant-isolation` PASS.

**Isolation seed fix:** `seed-isolation.ts` refreshes `service_date` to today so `projectPublishedDutiesForDriver` still returns Org A published duty.

---

## Yard Bodywork — report slice (done)

**Scope delivered:** Report-damage wizard steps 1–5 (confirm → zone → details → photo → review) + `damage.report` server write via outbox. Not repair lifecycle / Admin mirrors.

**Files:** `src/features/vehicle-bodywork/ReportDamageWizard.tsx`, route `$vehicleId/report`, Command `body-condition.ts` `damage.report`.

**Remaining (later):** repair request / verification lifecycle, Admin damage mirrors.

---

## Tenant F-02 / F-03 — next slice

| Item | Action |
|------|--------|
| F-02 depth | Extend `tenant-isolation-smoke.mjs` for new hubs as they ship (attendance when live) |
| F-03 journey-sequence mock | Remove or gate behind explicit test flag in Admin dispatch journey preview |
| Attendance | Keep fail-closed empty hub — no production mock data |

Run before release: `cd "Veyvio admin " && npm run test:tenant-isolation`
