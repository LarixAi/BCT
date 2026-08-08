# Veyvio production gates

**Status:** Active planning source of truth  
**Created:** 24 July 2026  
**Audience:** Product, engineering, operations, compliance, QA  
**Scope:** Driver, Yard, Command, Maintenance — production readiness before public store launch  

**Related documents**

| Document | Role |
|----------|------|
| [`Veyvio_Combined_Blueprint_v2.0.docx`](../blueprint/Veyvio_Combined_Blueprint_v2.0.docx) | **Product authority** (v2.0; supersedes v1.0) |
| [`Veyvio_Combined_Blueprint_1.docx`](../blueprint/Veyvio_Combined_Blueprint_1.docx) | Superseded — do not use as sole authority |
| [veyvio-blueprint-alignment-plan.md](./veyvio-blueprint-alignment-plan.md) | Blueprint → gates gap tracker and phase index |
| [veyvio-phase0-freeze.md](./veyvio-phase0-freeze.md) | Phase 0 freeze and reproducibility recovery |
| [veyvio-driver-full-remediation-plan.md](./veyvio-driver-full-remediation-plan.md) | P0–P3 technical remediation detail |
| [veyvio-multi-tenant-saas-roadmap.md](./veyvio-multi-tenant-saas-roadmap.md) | SaaS tenancy and entitlements |
| [veyvio-yard-roadmap.md](./veyvio-yard-roadmap.md) | Yard prototype → production sync |
| [09-vehicle-reporting-system.md](../architecture/09-vehicle-reporting-system.md) | Unified vehicle reports and status |
| [08-vehicle-condition-damage.md](../architecture/08-vehicle-condition-damage.md) | Body condition and damage chain |
| [veyvio-platform-backend-blueprint.md](./veyvio-platform-backend-blueprint.md) | Target modular monolith and events |

---

## 1. Executive decision

**Production readiness is more important than store readiness.**

There is no value shipping to the Play Store or App Store if an operator with hundreds of drivers cannot run a full shift without touching another system. Store mechanics (signing, privacy manifests, screenshots) belong in **Gate 3**, after Command integration and fleet operations are closed.

### Current readiness (July 2026)

| Area | Score | Notes |
|------|-------|-------|
| UI / UX | 9–9.5 | Strong Driver and Yard shells; screens exist for most operational steps |
| Architecture (design) | 8.5–9.0 | Command-first direction, shared types, ADRs, module boundaries |
| Backend integration (implemented) | 6–6.5 | ~72% of Driver daily ops on Command; dual damage models; mock gaps |
| Operational workflow (closed loop) | 5.5–6 | UI covers morning→sign-off; localStorage and partial server paths remain |
| Production readiness | 5.5–6 | P0 remediation largely open; false sync confidence is a stop-ship risk |
| Store readiness | 3.5–4 | Identity, signing, legal, push not production-ready |
| SaaS tenancy (implemented) | ~75% | JWT `active_company_id` + company picker; queue/cache weak spots |

**Weighted transport-company readiness: ~55–60%** — strong prototype, not yet safe for live fleet at scale.

---

## 2. Four gates (summary)

```text
Gate 1 — Core platform complete
  Command-only writes, fail-closed session/tenancy, durable outbox, truthful sync,
  end-to-end duty lifecycle, Driver→Yard damage chain (server-side)

Gate 2 — Fleet operations ready
  Vehicle read model, compliance engine, fuel/AdBlue, fleet timeline,
  notification platform, reporting, depot-scoped SaaS validation

Gate 3 — Store readiness
  Bundle IDs, release signing, privacy/legal, push, production env, store assets

Gate 4 — Production launch
  Pilot operator, device matrix, pen test, telemetry, CI/CD release trains
```

**Do not open Gate 3 until Gate 1 exit tests pass for at least one pilot company.**

### Implementation progress (live tracker)

| Workstream | Item | Status | Evidence |
|------------|------|--------|----------|
| **P0-04** | Truthful offline queue count (checks + location) | Done | `driver-sync-status.service.js`, `DriverSyncCentre.jsx` |
| **P0-04** | Live Command capability probes (not static matrix) | Done | `probeDriverCommandCapabilities()` |
| **P0-02** | Remove Supabase walkaround fallback when Command configured | Done | `vehicle-check.service.js` |
| **P0-05** | Message drafts in workspace IndexedDB (not plaintext localStorage) | Done | `driver-sensitive-storage.js` |
| **P0-05** | Offline message outbox (`message_start` / `message_reply`) | Done | `messages.service.js`, ops outbox |
| **P0-06** | Server sign-on rejection (server + UI) | Done | `evaluateDriverSignOnEligibility`, `DriverMyDuty.jsx`, `driver-sign-on-gate.js` |
| **P0-06** | Walkaround result shows sign-on blocked from server | Done | `DriverWalkaroundFlow.jsx`, `WalkaroundResultScreen.jsx` |
| **P0-08** | Durable media outbox (walkaround photos) | Done | `walkaround-media-outbox.js` |
| **B1** | Defect/incident offline outbox | Done | `driver-ops-outbox.*`, defect + incident screens |
| **B2** | Tenant-scoped fleet ping queue + legacy migration | Done | `fleet-tracking-queue.storage.js` |
| **B2** | Location ping flush uses workspace scope | Done | `driver-location-ping.service.js` |
| **D** | Auto `yard_tasks` on driver bodywork defect | Done | `ensureYardFollowUpForDriverDefect()` in `command-api` |
| **D** | Link defects ↔ `vehicle_damage_cases` | Done | `defect-damage-link.ts`, migration `202607250002` |
| **D** | Vehicle status → `vor` / `awaiting_check` on damage | Done | Same handler |
| **A1** | Base44 vite plugin gated (`VITE_ENABLE_BASE44`) | Done | `veyvio-driver-App/vite.config.js` |
| **A1** | PHV/Base44 gated (`VITE_ENABLE_PHV_MODULE`) | Done | Fail-closed Vite aliases → `base44Client.stub.js` / `base44-sdk.stub.js`; lazy PHV job panel |
| **A1** | Remove Base44 source files from repo | Waived | Legacy PHV tree retained for optional TfL pilots; production bundle has zero Base44 SDK |
| **P0-09** | Remove Driver localStorage platform-event bridge | Done | `yard-parking.service.js` — Yard reads `yard_movements` via Command |
| **G2** | Driver vehicle readiness projection | Done | `projectDriverVehicleReadiness`, `DriverVehicleHub.jsx` |
| **G2** | Vehicle documents from Command (not stub dates) | Done | `DriverVehicleDocuments.jsx`, `GET driver/vehicle-readiness` |
| **G2** | Sign-on blocks VOR + critical defects | Done | `evaluateDriverSignOnEligibility` vehicle profile gate |
| **G2** | Handback + fuel events to Command (`vehicle_reports`) | Done | `recordDriverVehicleHandbackReport`, `DriverVehicleHandback.jsx` |
| **G2** | Driver vehicle timeline (checks, defects, yard, handback) | Done | `projectDriverVehicleTimeline`, `DriverVehicleTimeline.jsx` |
| **G2** | AdBlue refill → `adblue_records` + timeline | Done | `driver/adblue-refill`, `DriverAdBlueRefill.jsx` |
| **P0-10** | Production build scan (no mock/Base44/PHV) | Done | `scripts/verify-production-build.mjs`, CI job |
| **P0-10** | Android debug APK artifact in CI | Done | `.github/workflows/ci.yml` `driver-android` |
| **Gate 1** | Pilot exit runbook + automated smoke | Done | `gate1-pilot-exit-test.md`; `gate1:bct-pilot-setup` seeds pilot driver + runs live smoke |
| **G2** | Driver in-app notifications (duty, compliance, VOR) | Done | `driver-ops-notifications.ts`, `publishDuty`, bootstrap sync |
| **G2** | Driver telemetry in reports API | Done | `reports/summary` + `reports/performance` `driverTelemetry` |
| **Gate 1** | CI `gate1-preflight` job (F-17) | Done | `.github/workflows/ci.yml`; live 15/15 verified 25 Jul 2026 |
| **TD-008** | Server yard permissions on hub + mutations | Done | `yard-permissions.ts`; `POST /yard/mutations` enforces role permissions |
| **F-12** | Driver API write boundaries | Done (code) | `driver-write-guards.ts`; AdBlue, parking/handback, messages, location + defects/incidents/checks |
| **TD-009** | Yard mutation handlers (26/26 types) | Done (code) | `yard-mutation-handlers.ts`; inventory in `yard-mutation-inventory.ts` |
| **F-07** | Override audit | Done (prod) | `override_audit_events` + assignDuty override reason; `GET /overrides` |
| **F-08 / TD-005** | Journey lifecycle on Command | Done (prod) | `POST driver/journeys/:id/start\|complete` + `stops/arrive\|complete` |
| **F-05** | Compliance automation settings | Done (prod) | automation-settings + vehicle MOT/PMI/service/tyre gates + `POST compliance/notify-expiring` |
| **G2** | Vehicle reports Command API | Done (prod) | `/vehicle-reports*` live; Admin hub has no empty mock fallback |
| **F-07 UI** | Override audit visible in Command | Done (prod) | Admin Audit Log → Safety overrides panel |
| **G2** | Fuel refill + equipment → Command | Done (prod) | `fuel_records`, `vehicle_equipment_checks`, Driver `/vehicle/fuel` |
| **F-09 / F-10 / F-14** | Events, audit helper, integration keys | Done (prod) | `domain_events`, `audit-service`, `integration_api_keys` |
| **G2** | FCM push delivery (Android) | Verified (prod) | `fcm-send.ts`, migration `202607280001`, handset shade 28 Jul 2026 |
| **G2** | Job execution + duty closeout + vehicle swap | Verified (prod) | `test:gate2-live` + tenant-isolation 28 Jul; [gate2-wip-triage.md](./gate2-wip-triage.md) |
| **G2** | Gate 2 RLS migration | Verified (deployed) | `202607270001` applied; tenant-isolation PASS |
| **F-02** | Tenant isolation depth | Partial | Isolation smoke includes job execution / closeout / swap; extend as hubs ship |
| **F-03** | No mock/fallback production (full replacement) | Partial | Exec Gate 0–2 Done (deployed); Gate 3 Partial (`test:f03-gate0` + Admin fallback inventory); Gate 4 Partial (purchasing honest empty; quarantine open) — [veyvio-f03-mock-replacement-plan.md](./veyvio-f03-mock-replacement-plan.md) |
| **Yard** | Bodywork report wizard (steps 1–5) | Done (slice) | `ReportDamageWizard` + `damage.report` outbox — [gate2-wip-triage.md](./gate2-wip-triage.md) |

_Update this table as Gate 1/2 items ship._

---

## 3. Gate 1 — Core platform complete

**Goal:** A driver completes login → readiness → check → duty → jobs → defects/incidents → handback → sign-off on patchy 4G. Every safety-critical action is either **server-accepted** or **visibly pending**. Admin and Yard see the same events without manual re-entry.

### 3.1 Exit test (pilot)

**Automated (25 Jul 2026):** `gate1:rotate-credentials` + service-role confirmed + CI secrets pushed + `gate1:device-exit` (10/10) + preflight **16/16** + Yard e2e **22/22**.

**Android handset (25 Jul 2026 — PASS):** Samsung `R5GL13DVHCH`, BCT pilot `pilot-driver@veyvio.test`, BX62 BCT. Rows 1–9 and 11 signed in `docs/plan/.gate1-handset-android.local.md` (sync queue, offline drain, duty ack/sign-on, bodywork→Yard, handback VR-00001, in-app notifications, production APK). Row 10 N/A (single tenant). Biometric unlock required on device for operator sessions. FCM duty-published tap → Driver foreground verified 28 Jul 2026.

**Android-only supervised pilot (allowed):** When ops lead marks **PASS** on the Android sign-off block after one live shift ([bct-pilot-live-shift-runbook.md](./bct-pilot-live-shift-runbook.md)), BCT may run a small Android fleet with Command + Yard as the only record. This does **not** satisfy Gate 3 store submit.

**Still manual for full Gate 1 / store:** Full **iOS** physical checklist ([gate1-ios-xcode-runbook.md](./gate1-ios-xcode-runbook.md)).  
**Operator runbook:** [gate1-operator-physical-runbook.md](./gate1-operator-physical-runbook.md) · **Store scaffold:** [gate3-store-readiness.md](./gate3-store-readiness.md)

1. BCT (or chosen pilot) driver on physical Android (+ iOS before store submit).
2. Airplane mode mid-walkaround → queue grows → reconnect → server receives check with evidence.
3. Sync centre shows real pending count (never hardcoded `0`).
4. Damage report appears in Yard hub within 60s without ops copy-paste.
5. Sign-on rejected when bootstrap says not eligible (server message, not silent local success).
6. No Base44 code path executed in production build.
7. CI green on `main` for Driver + shared ops contract tests.

---

### 3.2 P0 remediation map

Maps to [veyvio-driver-full-remediation-plan.md](./veyvio-driver-full-remediation-plan.md) Part I.

| ID | Title | Status (Jul 2026) | Gate 1 work |
|----|-------|-------------------|-------------|
| P0-01 | Remove mock bootstrap | Done (code) | Command-only bootstrap; mock cache blocked in Yard production |
| P0-02 | Remove mock mutation fallback | Done (code) | `yard-mutation-inventory.ts` + fail-closed Command push; mapping tests |
| P0-03 | Fail-closed session/tenancy | Partial | Client storage isolation tests; yard hub/mutation in `tenant-isolation-smoke.mjs` |
| P0-04 | Truthful sync states | Done | Unified queue reader; capability matrix from live probes |
| P0-05 | Encrypted message persistence | Done | IndexedDB drafts + ops outbox; native encryption is Gate 2 |
| P0-06 | Server lifecycle enforcement | Done | Sign-on/check/duty transitions rejected server-side |
| P0-07 | Incident/safeguarding delivery | Done (prod) | migration `008` deployed; ack/escalate/detail routes live; driver receipt reference |
| P0-08 | Durable media outbox | Done | Walkaround photos survive process death via IndexedDB |
| P0-09 | Operations event delivery | Done | Driver no longer mirrors parking events to localStorage; Yard hub loads from Command |
| P0-10 | Mandatory CI | Done | Driver production guards + Android APK artifact |

---

### 3.3 Workstream A — Command integration (remove dual write paths)

**Principle:** Driver owns presentation and command preparation only. Command owns validation, state transitions, and audit.

#### A1. Remove Base44 from production build

| Task | Files | Done when |
|------|-------|-----------|
| Delete or isolate PHV tree behind `VITE_PHV_MODULE=false` (default off) | `veyvio-driver-App/src/lib/sendJobOffer.js`, `acceptJobOffer.js`, `declineJobOffer.js`, `src/components/driver/phv-job/*`, `useDriverHomeData.js`, `DriverInboxScreen.jsx` | Production bundle has zero Base44 imports |
| Remove `@base44/vite-plugin` | `veyvio-driver-App/vite.config.js`, `package.json` | `npm run build` succeeds without Base44 |
| Retire deprecated heartbeat | `useLocationHeartbeat.js`, `useDriverLocationBeacon.js` | Location uses Command ping path only |

#### A2. Single write path per domain

| Domain | Live Command path | Retire / gate |
|--------|-------------------|---------------|
| Bootstrap | `driver-bootstrap.service.js` → `GET driver/bootstrap` | Mock/fixture bootstrap in `mock-client` paths |
| Sign-on / sign-off | `command-driver-ops.service.js` | Local duty state without server ack |
| Vehicle checks | `vehicle-check.service.js` → `POST driver/vehicle-checks` | `insertWalkaroundCheck` Supabase fallback when Command configured |
| Defects | `DriverDefectReport.jsx` → `POST driver/defects` | Unused `defects.service.js` direct Supabase insert |
| Incidents | `incidents.service.js` (Command first) | Supabase fallback only when Command unreachable + explicit pending state |
| Location | `driver-location-ping.service.js` → `POST driver/location` | Legacy `driver_location_pings` table writes |
| Parking | `yard-parking.service.js` | — |
| Documents | `DriverSupabaseDocuments.jsx` | — |
| Messages | `messages.service.js` | — |
| Jobs / stops | `jobs.service.js` | Document Supabase vs Command ownership |

**Backend:** `Veyvio admin /supabase/functions/command-api/index.ts` — ensure every `driver/*` handler uses `authenticate` + `context.companyId`.

#### A3. Stale sync UI → live probes

| Task | Files |
|------|-------|
| Replace hardcoded capability matrix | `veyvio-driver-App/src/pages/driver/DriverSyncCentre.jsx` |
| Show real pending outbox count | New: unified outbox reader; wire walkaround + location + (future) defects/incidents |
| Probe endpoints for Live/Missing/Partial | Extend pattern from `probeDriverTrainingConnection` in `training.service.js` |

---

### 3.4 Workstream B — Unified durable outbox

**Principle:** Every safety-critical mutation gets an idempotent command envelope, durable local write, and visible sync state.

#### B1. Outbox scope (Gate 1 minimum)

| Command type | Queue today | Gate 1 target |
|--------------|-------------|---------------|
| Vehicle check (+ bodywork evidence) | `walkaround-sync.storage.js` | ✓ extend media refs |
| Location ping | `fleet-tracking-queue.storage.js` | ✓ tenant-scope keys |
| Defect report | `driver-ops-outbox.service.js` | ✓ idempotent `clientId` + server revalidation |
| Incident report | `driver-ops-outbox.service.js` | ✓ idempotent `clientId` + blocked flush on 4xx |
| Duty sign-on / sign-off | `driver-ops-outbox.service.js` | ✓ offline queue + server revalidation on replay |
| Message send | None | Add outbox (P0-05) |
| Job stop arrive/complete | None | P1 if not Gate 1 |

#### B2. Tenant-scoped storage keys

| Task | Files |
|------|-------|
| Scope fleet ping queue by `companyId` + `membershipId` | `fleet-tracking-queue.storage.js`, `driver-location-ping.service.js` |
| Scope equipment/handback drafts | `DriverVehicleEquipment.jsx`, `DriverVehicleHandback.jsx` → use `driver-workspace-storage.js` pattern |
| Key bootstrap cache by company | `driver-bootstrap.service.js` (in-memory TTL) |

**Reference:** `veyvio-driver-App/src/lib/driver-workspace-storage.js`

#### B3. Sync state model (P0-04)

Implement states: `synced` | `pending` | `syncing` | `failed` | `blocked` | `stale`.

UI copy must never show "synced" without server acknowledgement timestamp.

---

### 3.5 Workstream C — Duty lifecycle (morning → sign-off)

**Canonical hierarchy:** Duty → Journey → Route → Stop → Passenger task ([remediation plan §2.4](./veyvio-driver-full-remediation-plan.md)).

| Step | Current | Gate 1 target | Key files |
|------|---------|---------------|-----------|
| Login + company | ✓ | ✓ | `DriverAuthEntry.jsx`, `DriverAuthSelectCompany.jsx`, `session.service.js` |
| Readiness | UI ✓ | Server gate before sign-on | `DriverReadiness.jsx`, `driver-readiness.service.js`, `projections.ts` `buildDriverEligibility` |
| Vehicle allocation | Partial | Bootstrap duty + assigned vehicle authoritative | `driver-bootstrap.service.js`, `DriverMyDuty.jsx` |
| Walkaround | ✓ Command | + media outbox | `DriverWalkaroundFlow.jsx`, `vehicle-check.service.js` |
| Documents | Driver ✓, vehicle stub | Vehicle docs from Command projection | `DriverVehicleDocuments.jsx` (replace stub) |
| Sign-on | ✓ | Server rejects invalid transitions (ack required, check gate) | `duty-lifecycle-gates.ts`, `command-driver-ops.service.js`, `command-api` duty handlers |
| Live tracking | Partial | Truthful sync + tenant-scoped queue | `useFleetTracking.js`, `driver-location-ping.service.js` |
| Messages | Done (code/prod) | No false "sent" — queued replies show pending; Command read receipts | `messages.service.js`, `DriverMessageThread.jsx`, `MessagesPage.tsx` |
| Defects / incidents | ✓ | + outbox + Yard side-effect | `DriverDefectReport.jsx`, `DriverSupabaseIncidentReport.jsx` |
| Vehicle swap | ~80% | Ops-approved request/approve on Command | `vehicle-swap-workflow.ts`, `VehicleSwapApprovalPanel.tsx`, `DriverChangeVehicle.jsx` |
| Job execution | ~80% | PHV steps mirrored to Command | `driver-job-execution.ts`, `job-execution-bridge.service.js`, `jobs.service.js` |
| Handback / parking | ~80% | Handback → Command + offline outbox | `vehicle-handback.service.js`, `DriverVehicleHandback.jsx` |
| Sign-off / hours | ~80% | Duty closeout on Command | `duty-closeout.ts`, `duty-closeout.service.js`, `DriverDutyCloseout.jsx` |

**Note:** Full journey state machine from [veyvio-driver-audit-delivery.md](./veyvio-driver-audit-delivery.md) (`activeJourneyId`, `canCompleteDuty`) is not in `veyvio-driver-App` today — Gate 1 needs minimum server-enforced duty sign-on/off; full S1–S5 journey machine may span Gate 1 + early Gate 2.

---

### 3.6 Workstream D — Driver → Yard → Maintenance chain (server)

**Principle:** One damage record, automatic yard work, visible status change. See [09-vehicle-reporting-system.md](../architecture/09-vehicle-reporting-system.md).

| Task | Owner | Files |
|------|-------|-------|
| Unify or link `defects` ↔ `vehicle_damage_cases` | Backend | `command-api/index.ts` `createBodyworkDefectsFromVehicleCheck`, `body-condition.ts` |
| Auto-create `yard_tasks` on driver bodywork defect (critical/major) | Backend | `command-api/index.ts` — hook after defect insert |
| Critical bodywork → auto VOR or `awaiting_inspection` | Backend | `body-condition.ts`, `vor-from-defect` logic (port server-side from `src/domain/yard/vor-from-defect.ts`) |
| Yard hub consumes unified reports | Yard + Admin | `map-yard-hub.ts`, `DriverBodyworkReportsSection.tsx` |
| Replace local-only `buildDefectTask()` auto-tasks | Yard | `server-task-automation.ts`, `task.create` mutation — live hub uses server UUIDs |
| Durable photo storage (not base64-only in JSON) | Backend + storage | Defect `evidence`, `body_inspection_media.storage_key` |
| Emit platform event on driver damage | Backend | `platform-events-hub.ts` — replace localStorage-only ingest |

**Exit:** Driver reports door damage with photo → Yard sees report in hub → task appears in `yard_tasks` → vehicle status reflects `awaiting_inspection` or `vor` without manual Admin entry.

---

### 3.7 Workstream E — Fail-closed compliance (Gate 1 minimum)

Full compliance engine is Gate 2. Gate 1 requires **server rejection** on sign-on when bootstrap eligibility blocks dispatch.

| Task | Files |
|------|-------|
| Surface `bootstrap.eligibility` / `accessStatus` on sign-on attempt | `command-api` `driverBootstrap`, `driver/duties/*/sign-on` |
| Server hard gates on assign / publish / sign-on | `dispatch-assignment-gates.ts`, `duty-lifecycle-gates.ts`, `duty-publication.ts` |
| Live dispatch gate smoke (VOR assign, ack before sign-on) | `tenant-isolation-smoke.mjs`, `npm run test:dispatch-gates-live` |
| Driver UI shows server rejection reason | `DriverMyDuty.jsx`, `DriverOperationalGuard.jsx` |
| Remove client-only dispatch as authority | `dispatchCompliance.js` — UI hints only, not gate |

---

### 3.8 Workstream F — CI and production guards (P0-10)

| Check | Location |
|-------|----------|
| Driver unit + domain tests | `veyvio-driver-App` vitest |
| Tenant isolation smoke | root `e2e/` or CI job |
| Production demo-control scan | No `VITE_MOCK_API`, no `VITE_DRIVER_NAV_TEST_MODE` in release profile |
| Android debug artifact retained | CI `assembleDebug` |
| Shared ops contract tests | `@veyvio/ops`, body-condition types |
| Secret scan | GitHub Actions | `scripts/audit-secrets.mjs` (`secrets-audit` CI job) |

---

## 4. Gate 2 — Fleet operations ready

**Goal:** Operator runs hundreds of drivers with vehicle intelligence, compliance blocking, fleet timeline, and Command reporting — without Excel or a second system.

### 4.1 Exit test

1. Ops manager blocks dispatch for expired CPC — driver cannot sign on.
2. Driver sees vehicle MOT/PMI/VOR/open defects on vehicle hub before check.
3. Fuel and AdBlue recorded as first-class events with Command history.
4. Fleet timeline shows driver damage → yard review → maintenance WO → RTS on vehicle record.
5. Notifications delivered for duty change, document expiry, yard VOR (in-app minimum; push if enabled).
6. Standard reports include attendance, missed inspections, defect trends from Driver telemetry.
7. Two companies on same device (sequential login) — zero cross-tenant data in cache or queues.

---

### 4.2 Vehicle read model (Driver consumes Command)

| Capability | Driver files | Backend / Admin |
|------------|--------------|-----------------|
| Bodywork history | `DriverVehicleHub.jsx` | `GET body-condition/hub`, yard hub `bodyworkReports` |
| Known damage / open defects | Vehicle hub | Defects projection |
| Tyre history | Walkaround + hub | Vehicle maintenance projection |
| Fuel / AdBlue history | New fuel/adblue capture flows | [09-vehicle-reporting-system.md](../architecture/09-vehicle-reporting-system.md) phases 1–2 |
| Equipment inventory | `DriverVehicleEquipment.jsx` | Sync to Command, not localStorage |
| Yard / VOR status | Vehicle hub | Authoritative status service |
| MOT / PMI / service due | Replace `DriverVehicleDocuments.jsx` stub | Vehicle compliance projection |
| Recalls | New | Fleet data source |
| Vehicle timeline | New driver timeline tab | Unified `vehicle_events` or reports API |

---

### 4.3 Compliance engine (server-authoritative)

Before dispatch / sign-on, validate (company-configurable):

**Driver:** licence, DBS, medical, CPC, MiDAS, induction, safeguarding, fire, first aid, wheelchair restraint, company-specific training.

**Vehicle:** tax, insurance, MOT, PMI, service, open critical defects, tyres, safety inspection, equipment (extinguisher, first aid, glass hammer, restraints).

| Task | Files |
|------|-------|
| Central compliance rules service | New `command-api` module or `compliance-engine.ts` |
| Vehicle compliance projection | Extend `projections.ts` beyond `buildDriverEligibility` |
| Execute defect automation server-side | Port `Veyvio admin /src/lib/defects/automation.ts` rules to API |
| Assignment blocking API | [09-vehicle-reporting-system.md](../architecture/09-vehicle-reporting-system.md) § Assignment blocking |
| Admin compliance dashboard | Command Admin drivers/vehicles modules |

---

### 4.4 Fleet timeline and reporting

| Task | Files |
|------|-------|
| Ship `vehicle_reports` API (schema exists) | Migration `202607190008_vehicle_reports_and_vor_episode.sql`; replace `mock-vehicle-reports.ts` |
| Cross-app audit timeline | `veyvio-platform-backend-blueprint.md` Phase 3–5 |
| Sync Yard custody timeline to Command | `src/store/yard.ts` → server events |
| Extend operational trail to vehicle lifecycle | `operational-trail.ts` (today trip/duty scoped) |
| Driver-fed reports | `build-standard-reports.ts`, `build-daily-operations.ts`, `report-catalog.ts` |

---

### 4.5 Notification platform

Role-based templates (minimum in-app; push in Gate 3):

| Audience | Examples |
|----------|----------|
| Driver | Shift reminders, duty/vehicle/route changes, training/doc/licence expiry, messages |
| Yard | Vehicle returned, awaiting inspection, new damage, repair complete, VOR |
| Command | Missed pickup, late driver, incident, no location, breakdown, complaint |

| Task | Files |
|------|-------|
| Consolidate announcements vs alerts | `veyvio-admin-notifications-messages.md`, Driver `/notifications` + `/messages` |
| Server notification rules engine | `command-api` notifications module |
| Push (optional Gate 2) | `push-registration.service.js`, Firebase + APNs |

---

### 4.6 SaaS multi-tenant hardening

| Task | Reference |
|------|-----------|
| Depot-scoped queries on all driver endpoints | `veyvio-multi-tenant-saas-roadmap.md` |
| RLS audit on Supabase tables used by Driver | Migrations `202607240010`, `202607240011` pattern |
| Entitlements module gating | `entitlements-core.ts` |
| Penetration test: cross-tenant read/write | Gate 4 security |

---

## 5. Gate 3 — Store readiness

**Prerequisite:** Gate 1 exit tests passed for pilot fleet. Gate 2 compliance minimum for your market (PSV/school/specialist).

**Working checklist:** [gate3-store-readiness.md](./gate3-store-readiness.md) (inventory + tick-boxes). Started 25 Jul 2026: iOS bundle unified to `uk.veyvio.driver`, display name **Veyvio Driver**, camera/location usage strings, `PrivacyInfo.xcprivacy` scaffold. Signing keys, push, and store assets remain operator/CI.

### 5.1 Identity and branding

| Task | Files |
|------|-------|
| Unify iOS bundle ID → `uk.veyvio.driver` | `veyvio-driver-App/ios/App/App.xcodeproj/project.pbxproj` |
| Update Supabase redirect URLs | `AUTH_EMAIL_SETUP.md`, Supabase dashboard |
| Native auth scheme | `driverAuthConfig.js` (`uk.veyvio.driver`) |
| Remove Ridova legacy assets | CSS vars, favicon, support email |
| Consistent display name | iOS `Info.plist`, Android `strings.xml` |

### 5.2 Release engineering

| Task | Notes |
|------|-------|
| Android upload keystore + `signingConfig` | Play requires AAB (`bundleRelease`) |
| iOS distribution cert + provisioning | App Store Connect |
| Production `.env` profile | `VITE_DRIVER_APP_URL`, Command API, no test modes |
| Version bump process | `versionCode` / `CFBundleShortVersionString` |
| Fastlane or CI release workflow | Internal testing → production |

### 5.3 Privacy and permissions

| Platform | Requirements |
|----------|--------------|
| iOS | Location, camera, photo library usage strings; `PrivacyInfo.xcprivacy`; background modes if tracking |
| Android | Data safety form; background location declaration; foreground service justification |
| Both | Public privacy policy URL; terms; support URL |

### 5.4 Push notifications

| Task | Files |
|------|-------|
| `google-services.json` in `android/app/` | Firebase project |
| APNs key in Apple Developer | iOS entitlements |
| `VITE_ENABLE_PUSH=true` in production build | `push-registration.service.js` |

### 5.5 Store listing assets

Screenshots, feature graphic, descriptions, age rating, export compliance questionnaire.

**Yard mobile** (`uk.veyvio.yard`, root `android/`): separate listing decision — internal MDM vs public Play Store; no iOS project in repo today.

---

## 6. Gate 4 — Production launch

**Second operator / SaaS:** Parked until entry criteria in [gate4-second-tenant-entry.md](./gate4-second-tenant-entry.md) are met (BCT live-shift accepted, tenant-isolation green, no production mock hubs). Do not start second-tenant product work in Gate 1–3.

### 6.1 Pilot deployment

- One real transport operator (e.g. BCT) — Android-only supervised pilot allowed after ops lead live-shift PASS ([bct-pilot-live-shift-runbook.md](./bct-pilot-live-shift-runbook.md)).
- Physical device matrix: mid-range Android, recent iPhone (iOS before store / multi-platform acceptance), poor-signal routes.
- Ops staff trained on Admin + Yard workflows tied to Driver events.

### 6.2 Security and assurance

- Penetration test (tenant isolation, auth, media URLs).
- Crash reporting and telemetry (Sentry or equivalent).
- Process-death and offline restart test suite.
- Safeguarding incident drill with audit trail proof.

### 6.3 CI/CD release trains

- Protected `main`; required checks per P0-10.
- Signed release artefacts retained.
- Staged rollout: internal → pilot fleet → wider fleet.
- Rollback procedure documented.

---

## 7. Morning → sign-off workflow matrix

Single-page reference for product and QA. **Gate** column indicates minimum gate for closed loop without another system.

| Step | ~% today | Gate | Primary files |
|------|----------|------|---------------|
| Login | 85% | 1 | `DriverAuthEntry.jsx`, `session.service.js` |
| Company / depot select | 85% | 1 | `DriverAuthSelectCompany.jsx` |
| Readiness | 70% | 1 | `DriverReadiness.jsx` |
| Vehicle allocated | 65% | 1 | `driver-bootstrap.service.js` |
| Vehicle inspection | 75% | 1 | `DriverWalkaroundFlow.jsx` |
| Documents checked | 55% | 1–2 | `DriverSupabaseDocuments.jsx`, `DriverVehicleDocuments.jsx` |
| Duty begins (sign-on) | 70% | 1 | `DriverMyDuty.jsx`, `command-driver-ops.service.js` |
| Live tracking | 65% | 1 | `driver-location-ping.service.js` |
| Messages | 85% | 1 | Delivery + read ack on thread |
| Defect reported | 70% | 1 | `DriverDefectReport.jsx` |
| Swap vehicle | 35% | 1–2 | `DriverChangeVehicle.jsx` |
| Continue duty / jobs | 60% | 1 | `DriverSupabaseJobView.jsx` |
| End duty | 50% | 1 | `DriverDutyCloseout.jsx` |
| Fuel | 60% | 2 | Walkaround + handback; fuel purchase TBD |
| AdBlue | 50% | 2 | Checklist item; standalone record Gate 2 |
| Damage report | 65% | 1 | `WalkaroundFailSheet.jsx` |
| Parking location | 55% | 1 | `yard-parking.service.js` |
| Sign off | 55% | 1 | Sign-off + declaration |
| Hours recorded | 65% | 2 | `DriverWorkingTime.jsx` |
| Compliance updated | 55% | 2 | `buildDriverEligibility`, compliance engine |

---

## 8. Integration chain reference

```text
Driver walkaround / defect
        ↓
command-api (defects + vehicle_checks)
        ↓
yard_tasks (auto) + vehicle status
        ↓
Yard hub (bodyworkReports) + body_condition tables
        ↓
Maintenance hub (work orders, estimates)
        ↓
RTS gate → vehicle available
        ↓
Command reporting + fleet timeline
```

**Today:** top two hops work; middle hops are partial (local Yard tasks, dual models); bottom hops are mostly planned.

---

## 9. Suggested delivery order (first 8 weeks)

| Week | Focus | Outcomes |
|------|-------|----------|
| 1–2 | A1–A3, B2, D (auto yard task + status) | No Base44 in prod; truthful sync UI; damage → Yard task |
| 3–4 | B1 outbox for checks/defects/incidents/sign-on; P0-08 media | Offline honesty; photos durable |
| 5–6 | C duty lifecycle + E fail-closed sign-on; F CI | Pilot shift without false synced |
| 7–8 | Gate 2 start: vehicle read model stub + compliance server rules | Vehicle hub shows real MOT/VOR/defects |

Adjust based on pilot operator date and BCT yard go-live.

---

## 10. Definition of done (platform)

Veyvio is **production-ready for a live fleet** when:

1. **Gate 1** exit tests pass on physical devices for the pilot company.
2. **Gate 2** compliance engine blocks illegal dispatch for that company's ruleset.
3. **No safety-critical action** displays success without server acknowledgement.
4. **Every record** is scoped by `company_id` (and depot where applicable).
5. **Yard and Command** reflect Driver events within agreed SLA without manual re-entry.
6. **Gate 3** complete before marketing the app on public stores.

Until then, classify the product as:

> **Operationally strong prototype — suitable for controlled demonstrations and engineering validation, not yet suitable for live passenger transport at fleet scale.**

---

## 11. Document maintenance

Update this file when:

- A gate exit test is passed (date + pilot company).
- P0 items in remediation plan gain implementation evidence.
- New architecture ADRs change the Driver→Yard→Maintenance contract.

**Owners:** Engineering lead (Gates 1–2), Mobile lead (Gate 3), Operations lead (Gate 4 pilot).
