# Veyvio Blueprint Alignment Plan

**Status:** Active — master index for aligning code to the Combined Blueprint  
**Created:** 24 July 2026  
**Blueprint:** [`docs/blueprint/Veyvio_Combined_Blueprint_v2.0.docx`](../blueprint/Veyvio_Combined_Blueprint_v2.0.docx) v2.0 (supersedes v1.0)  
**Execution spine:** [veyvio-production-gates.md](./veyvio-production-gates.md) (Gates 1–4)  
**Agent rule:** `.cursor/rules/veyvio-combined-blueprint.mdc`

---

## 1. Purpose

This document is the **hub** that connects the Combined Blueprint to what we build and ship. It does not duplicate the blueprint or the production-gates detail — it tracks **gaps**, **priority**, and **where to work next**.

**Principle:** Blueprint = target state. Production gates = stop-ship sequence. Code changes must close a named gap here or in the gates tracker.

### Portfolio apps (signed specs under Combined Blueprint v2.0)

Combined Blueprint v2.0 is the **platform** authority. These apps also have signed product specs that must stay consistent with v2 Hard Rules (tenancy, deny-by-default, no production mocks):

| App | Spec / notes |
|-----|----------------|
| Cost Control | [`Veyvio_Cost_Control_Master_Blueprint_v1.2.docx`](../blueprint/Veyvio_Cost_Control_Master_Blueprint_v1.2.docx) + `veyvio-cost-control/docs/` |
| Executive | `docs/blueprint/veyvio-executive-product-structure.md` + Executive deploy/security docs |
| Website | [`veyvio-homepage-blueprint-v2.md`](../blueprint/veyvio-homepage-blueprint-v2.md) + `docs/deploy/website-production.md` |

Reproducibility freeze: [veyvio-phase0-freeze.md](./veyvio-phase0-freeze.md).

---

## 2. How to use (humans and agents)

1. Pick a blueprint requirement (§7 workflow, §8 domain spec, or §18 Hard Rule).
2. Find its row in §4 (Hard Rules tracker) or §5 (domain alignment).
3. Implement against the linked gate task and files.
4. Update status + evidence when done.
5. Add new gaps to §6 Technical debt register.

---

## 3. Alignment phases (blueprint → gates)

| Phase | Blueprint source | Gate | Focus | Target |
|-------|------------------|------|-------|--------|
| **A** | Part F rules 1–4 | Gate 1 | Security foundation | Credentials, deny-by-default, remove mocks |
| **B** | Part F rules 2, 5–7 | Gate 1–2 | Tenancy + rules engine | `company_id` everywhere; eligibility/readiness gates |
| **C** | Part A §7 workflows | Gate 1 | Closed-loop duty lifecycle | Login → sign-off on Command only |
| **D** | Part A §8.3–8.4 | Gate 1–2 | Driver + Yard apps | Offline outbox, damage→yard chain |
| **E** | Part A §8.1–8.2 | Gate 2 | Command operations | Dispatch, bookings, live ops |
| **F** | Part F rules 8–10, 12 | Gate 2 | Platform services | State machines, audit, events |
| **G** | Part A §8.5–8.9 | Gate 2 | Fleet domain | Maintenance, tyres, onboarding baseline |
| **H** | Part D | Gate 2–4 | Enterprise | Compliance passports, audit packs |
| **I** | Part C | Post-launch | Intelligence | Digital twin, recommendations — **not before Gate 2** |
| **J** | §19 Gates 3–6 | Gate 3–6 | Store, pilot acceptance, second tenant, commercial SaaS |

**Current focus:** Blueprint v2.0 adopted. **TD-010 / F-18** done. **Gate 2 WIP triage:** [gate2-wip-triage.md](./gate2-wip-triage.md). Operator: Gate 1 iOS physical sign-off ([gate1-ios-xcode-runbook.md](./gate1-ios-xcode-runbook.md)).

**Last updated:** 25 July 2026 (TD-010 complete; F-03 fallback inventory)

### Deploy blocker (operator — not done in code alone)

All rows marked **Done (code)** under `command-api` require:

```bash
cd "Veyvio admin " && npm run backend:deploy
```

Ships: application scopes, defect↔damage link, dispatch gates, offline idempotency, `task.create`, duty lifecycle gates, yard permissions, driver write guards, yard mutation handlers (TD-009), BCT pilot seed, driver `/notifications` scope, roles matrix write, signed storage helper, rules engine entry, override audit, journey start/complete/stops, compliance automation settings + vehicle MOT/PMI/service/tyre columns, vehicle-reports API (no empty mock fallback), fuel records, domain events, integration API keys, `POST /compliance/notify-expiring`, incident workflow, **job execution events**, **duty closeouts**, **vehicle swap requests**.

**Deployed:** 25 Jul 2026 — migrations `202607250001`–`202607250009` applied; `command-api` ~1.2 MB live on `qeckgqjrfbdyxchuncdt` (includes P0-07 incidents + closed-loop duty extensions).

After deploy, verify live:

```bash
export VEYVIO_ANON_KEY="..."   # or source Admin .env + .gate1-secrets.local.env
npm run gate1:preflight -- --live --skip-build
npm run gate1:device-exit -- --skip-build
cd "Veyvio admin " && npm run test:gate2-live && npm run test:tenant-isolation
```

### Gate 1 / Gate 2 verification (25 Jul 2026)

| Suite | Command | Result |
|-------|---------|--------|
| Credential rotation | `npm run gate1:rotate-credentials` | **PASS** — isolation + pilot passwords; `.gate1-secrets.local.env` |
| Service role confirm | Supabase secrets list + live seeds | **Confirmed current** (`SUPABASE_SERVICE_ROLE_KEY` present; seeds/API green) |
| CI secrets | `set-github-ci-secrets.mjs` | **PASS** — anon/API/platform/isolation/pilot pushed |
| Gate 1 device exit API | `npm run gate1:device-exit` | **8/8 PASS** |
| Android handset | `npm run gate1:device-handset` | **PASS** — APK install, launch, airplane on/off on `R5GL13DVHCH` |
| iOS physical rows | operator checklist | **Open** — no iOS device attached |
| Gate 1 preflight live | `npm run gate1:preflight -- --live --skip-build` | **16/16 PASS** |
| Yard Playwright e2e | `npm run test:e2e` | **22/22 PASS** |
| Admin unit (roles/storage/rules) | `roles-matrix` / `signed-storage` / `rules-engine` | **PASS** |
| Roles PATCH + signed-url live | Command API | **PASS** — PATCH grants; cross-tenant signed-url **403** |
| Gate 2 shared unit | `npm run test:gate2-unit` | **PASS** |
| Gate 2 live smoke | `npm run test:gate2-live` | **PASS** — incidents hub; vehicle-swap-requests; driver duty-closeout + job execution routes (migrations `008`–`009`) |
| Tenant isolation + yard live | after P0-07 deploy | **PASS** — includes VOR `assignment_blocked` without override |
| CORS OPTIONS | `OPTIONS /auth/login` | **200** (corsHeaders import fix) |

Pilot fixture: `pilot-driver@veyvio.test` (password in `.gate1-secrets.local.env`) — vehicle **BX62 BCT**.

### Shipped in code (24–25 Jul 2026)

| ID | Task | Status | Evidence |
|----|------|--------|----------|
| F-01 / TD-006 | Application scope middleware on `command-api` | Done (prod) | `_shared/application-scopes.ts` |
| F-17 | Stop-ship scope + storage tests | Done (automated) | `tenant-isolation-smoke.mjs`, `gate1-preflight` CI |
| F-02 / P0-03 | Cross-tenant client storage isolation | Done (code) | Driver/Yard scoped keys; isolation smoke |
| TD-002 | Unify defects ↔ `vehicle_damage_cases` | Done (prod) | `defect-damage-link.ts`, migration `202607250002` |
| TD-004 / F-06 | Server dispatch assignment hard gates | Done (prod) | `dispatch-assignment-gates.ts` |
| F-15 / B1 | Offline ops idempotent replay + revalidation | Done (prod) | Defect/incident + duty outbox |
| TD-007 | Yard tasks via server UUIDs | Done (prod) | `task.create` + `server-task-automation.ts` |
| TD-003 / F-03 | Base44/PHV fail-closed in production builds | Done (code) | Vite stubs + `verify-production-build.mjs` |
| F-04 | Rotate and secure credentials | Done (ops) | `gate1:rotate-credentials`; service role confirmed; CI secrets set |
| TD-005 / F-08 | Duty + journey lifecycle server-enforced | Done (prod) | `duty-lifecycle-gates.ts` + `journey-lifecycle-gates.ts` + start/complete + `stops/arrive|complete` |
| TD-001 | Command-first bootstrap | Done (code) | Yard rejects mock cache in production |
| Gate 1 pilot prep | Preflight + BCT runbooks | Done | `gate1-preflight.mjs`, pilot exit docs |
| TD-008 / F-11 | Yard + Command permission matrix | Done (prod read+write) | `listRolesMatrix` + `PATCH settings/roles/:id/permissions` + Admin UI |
| F-12 | Driver write boundary validation | Done (prod) | `driver-write-guards.ts` |
| P0-02 / TD-009 | Yard mutation inventory + handlers | Done (prod) | 26/26 types |
| Gate 1 BCT seed | Pilot driver + duty | Done (prod) | `seed-bct-pilot.ts`, migrations `004`–`005` |
| F-13 | Signed URLs + tenant storage paths | Done (code/prod) | `_shared/signed-storage.ts` + `POST /storage/signed-url` + Driver walkaround prefers Command signed URL |
| F-05 | Shared rules + compliance engine | Done (prod) | MOT/PMI/service/tyre columns → release failures; automation-settings PMI/tyre flags; `POST compliance/notify-expiring` |
| F-07 | Overrides never silent | Done (prod) | `override_audit_events` + Admin Audit Log overrides panel + assignDuty reason |
| F-09 | Domain events | Done (prod) | `domain_events` + `emitDomainEvent` |
| F-10 | Immutable audit helper | Done (prod) | `audit-service.ts` `writeImmutableAudit` |
| F-14 | Integration API keys | Done (prod) | `integration_api_keys` + settings routes |
| F-16 | Time-boxed support grants | Done (code) | `support-access.ts` revoke/active helpers |
| Gate 2 fleet ops | Vehicle reports, fuel, equipment, timeline WO/RTS, reports telemetry | Done (prod) | `vehicle-reports.ts`, `fuel_records`, equipment checks, projections timeline |
| **P0-07** | Incident ack/escalate/detail + driver receipt | Done (prod) | migration `008`, `incident-workflow.ts`, gate2-live incident probes |
| F-08 UI | Driver duty nav → Command journey start/stop/arrive/complete | Done (code) | `command-duty-nav-server.js`, `DriverDutyNavigation.jsx` |
| F-15 UI | Journey steps offline outbox + sync centre count | Done (code) | `command-duty-nav-outbox.js`, `driver-ops-outbox.service.js` |
| G2 Config | Compliance rules edit UI (F-05) | Done (code) | `ComplianceRulesPage.tsx` PATCH automation-settings |
| **G1 duty loop** | PHV job execution → Command mirror | Done (prod) | migration `009`, `driver-job-execution.ts`, `job-execution-bridge.service.js`, `jobs.service.js` |
| **G1 duty loop** | Duty closeout on Command + outbox | Done (prod) | `duty-closeout.ts`, `duty-closeout.service.js`, `DriverDutyCloseout.jsx` |
| **G1 duty loop** | Ops-approved vehicle swap | Done (prod) | `vehicle-swap-workflow.ts`, `VehicleSwapApprovalPanel.tsx`, `DriverChangeVehicle.jsx` |
| G2 dispatch UX | Board summary + swap approval panel | Done (code) | `DispatchPage.tsx` stats; pending swap approve/reject |
| **TD-010** | Admin job execution read path | Done (prod) | `GET jobs/:id/execution`, `JobExecutionPanel`, Run/Trip detail |

### Next in plan order

| ID | Task | Priority | Notes |
|----|------|----------|-------|
| **Gate 1 iOS** | Physical iOS checklist sign-off | Operator | Runbook: [gate1-ios-xcode-runbook.md](./gate1-ios-xcode-runbook.md); signing unblocked 28 Jul 2026 — device install pending |
| **Gate 1 manual UI** | Sync / handback / push on device | Operator | Defect→Yard API chain in device-exit; UI still eyes-on |
| **TD-010** | Retire PHV Supabase dual-write for jobs | Done (code) | F-18 | Gate 2 | Command authoritative; legacy cache **only** when offline queued; hub list enriched from Command |
| **Gate 3** | Store readiness checklist | Scaffold | [gate3-store-readiness.md](./gate3-store-readiness.md) — after Gate 1 iOS |
| **Part C** | Intelligence | Deferred | Blueprint: not before Gate 2 exit |

### Active work (25 Jul 2026)

| ID | Task | Status | Evidence |
|----|------|--------|----------|
| Gate 1 iOS | Physical checklist | **Operator** | No iOS device in environment |
| Gate 1 manual UI | Sync / handback / push on device | **Operator** | Automated API green; eyes-on UI sign-off |
| G1 duty loop | Job execution Command mirror | Done (prod) | migration `009`, `driver-job-execution.ts`, gate2-live |
| G1 duty loop | Duty closeout on Command | Done (prod) | `duty-closeout.ts`, offline `duty_closeout` outbox |
| G1 duty loop | Vehicle swap request/approve | Done (prod) | `vehicle-swap-workflow.ts`, `VehicleSwapApprovalPanel.tsx` |
| TD-010 | Retire PHV Supabase dual-write | Done (code) | `shouldWriteLegacyExecutionCache` queued-only; hub `enrichJobRowsWithExecution`; snapshot guards on accept/start/complete |

---

## 4. Hard Rules tracker (§18 — F-01 to F-35)

v2.0 expands the rule set from 17 to **35**. F-01–F-17 retain v1.0 implementation status. F-18+ are new v2.0 controls.

| ID | Rule | Class | Status | Evidence / gap |
|----|------|-------|--------|----------------|
| F-01–F-17 | See v1.0 rows below | Mixed | Mostly Done | Implemented Jul 2026 |
| **F-18** | One source of operational truth | Red | **Done (code)** | TD-010: Command-first driver writes; admin `GET jobs/:id/execution`; no Supabase execution cache when online |
| **F-19** | Enforced tenant on all records | Red | Partial | Core tables scoped; derived data depth ongoing |
| **F-20** | Depot/resource boundaries | Amber | Partial | Depot on reads; not all write paths |
| **F-21** | Safety beats convenience | Red | Done (prod) | Hard dispatch/sign-on gates |
| **F-22** | No uncontrolled prod DB edits | Red | Done (ops) | Migrations + command-api |
| **F-23** | Attributable actions | Amber | Partial | Audit on material writes |
| **F-24** | UTC server time | Amber | Partial | Server timestamps |
| **F-25** | History retained safely | Amber | Partial | Append events; retention TBD |
| **F-26** | Media integrity | Amber | Partial | Signed URLs; provenance partial |
| **F-27** | Compliance from evidence | Red | Partial | Rules engine; some UI still declarative |
| **F-28** | Workflow accountable owner | Amber | Partial | Incidents, swap; not all domains |
| **F-29** | Notifications ≠ state | Amber | Done (prod) | Domain records authoritative |
| **F-30** | Command without mobile | Red | Partial | Server truth; offline within limits |
| **F-31** | Server-controlled feature flags | Amber | Partial | Entitlements shallow |
| **F-32** | Client compromised assumption | Red | Done (prod) | Server enforcement |
| **F-33** | Event history not overwrite | Amber | Partial | Job execution events; not all entities |
| **F-34** | Explainable automation | Amber | Partial | Block reasons on assign |
| **F-35** | Blueprint before code | Amber | Done (process) | Alignment plan + gates |

### F-01 to F-17 (v1.0 baseline — unchanged)

| ID | Rule | Status | Evidence |
|----|------|--------|----------|
| **F-01** | Deny-by-default; application scopes | Done (prod) | `application-scopes.ts` |
| **F-02** | Structural tenant isolation | Partial | Live isolation smoke incl. job execution, closeout, swap; Gate 5 depth |
| **F-03** | No mock/fallback production | Partial | Exec Gate 0 Done; exceptions + equipment + stock/cards + tyres Done (code); website demo persist-first Done (TD-025); remaining: purchasing + quarantine — [veyvio-f03-mock-replacement-plan.md](./veyvio-f03-mock-replacement-plan.md) |
| **F-04** | Rotate credentials | Done (ops) | `gate1:rotate-credentials` |
| **F-05** | Centralise business rules | Done (prod) | `compliance-engine.ts` |
| **F-06** | Safety hard gates | Done (prod) | VOR + ack-before-sign-on |
| **F-07** | Overrides never silent | Done (prod) | `override_audit_events` |
| **F-08** | Explicit state machines | Done (prod) | Duty/journey + job execution on Command |
| **F-09** | Material writes → events | Done (prod) | `domain_events` |
| **F-10** | Immutable audit | Done (prod) | `audit-service.ts` |
| **F-11** | Granular permissions | Done (prod) | Matrix UI + PATCH |
| **F-12** | API boundary validation | Done (prod) | `driver-write-guards.ts` |
| **F-13** | Secure files | Done (prod) | `signed-storage.ts` |
| **F-14** | Secure API keys | Done (prod) | `integration_api_keys` |
| **F-15** | Offline revalidation | Done (prod) | Full ops outbox incl. `job_execution` |
| **F-16** | Temporary support access | Done (code) | `support-access.ts` |
| **F-17** | Stop-ship tests in CI | Done (automated) | CI + live preflight |

---

## 5. Application alignment (Part A)

### 5.1 Veyvio Driver (Part A §8.3)

| Blueprint capability | Status | Gate | Primary files / notes |
|---------------------|--------|------|------------------------|
| Home: duty, vehicle, depot, countdown | ~85% | 1 | `DriverSupabaseHome.jsx`, bootstrap |
| Vehicle checks + media queue | ~80% | 1 | `DriverWalkaroundFlow.jsx`, outbox done |
| Trips / job execution | Done (code) | 1 | **F-18 / TD-010** — Command authoritative; hub enriched; admin execution panel on Runs/Trips |
| Duty closeout | ~80% | 1 | `duty_closeouts` on Command + offline outbox; Supabase fallback when Command off |
| Vehicle swap (ops-approved) | ~80% | 1 | `vehicle_swap_requests` + Dispatch approval panel; block-only gate retained |
| Messages + operational comms | ~85% | 1 | Delivery/read ack on thread; queued replies visible; Command shows "Read by driver" |
| End shift: mileage, fuel, AdBlue, handback | ~80% | 1–2 | Handback on Command + offline outbox |
| Sign-on eligibility gate | ~85% | 1 | Server rejection + rules engine assignment wrap |
| No mock bootstrap in production | Done | 1 | P0-01 — Command-first duty |
| Driver write boundaries | Done (prod) | 1 | F-12 |
| Application scope: driver only | Done (prod) | 1 | F-01 |

### 5.2 Veyvio Yard (Part A §8.4)

| Blueprint capability | Status | Gate | Primary files / notes |
|---------------------|--------|------|------------------------|
| Home: exceptions, VOR, tasks | ~75% | 1–2 | Yard home, fleet dashboard |
| Vehicle bodywork / damage hub | ~70% | 1 | Damage chain server-side |
| Movements, bay, keys | ~65% | 1 | Sync engine; `vehicle.move` |
| VOR / return to road | ~70% | 2 | Command handlers (TD-009) |
| Offline sync | ~75% | 1 | Fail-closed inventory |
| Yard mutation → Command mapping | Done (prod) | 1 | 26/26 types |
| Hub permissions from server | Done (prod) | 1 | `yard-permissions.ts` |
| Yard tasks from driver defects | Done | 1 | `task.create` |

### 5.3 Veyvio Command (Part A §8.1–8.2)

| Blueprint capability | Status | Gate | Primary files / notes |
|---------------------|--------|------|------------------------|
| Bookings → jobs → runs → trips | ~50% | 2 | Admin runs/trips plans |
| Live operations / dispatch | ~60% | 2 | Hard gates live; summary stats; **vehicle swap approval panel** on Dispatch |
| Scheduling board | ~45% | 2 | Planning summary: unscheduled, safeguarding, unpublished runs, unassigned trips |
| Compliance dashboard | ~60% | 2 | Eligibility + editable automation settings |
| Reporting + vehicle timeline | ~55% | 2 | Reports API, driver telemetry |
| Configuration centre / rules library | ~55% | 2 | `ComplianceRulesPage.tsx` — editable assignment gates + expiry table |

### 5.4 Platform (Part A §3, Part E)

| Blueprint capability | Status | Gate | Notes |
|---------------------|--------|------|-------|
| Tenant hierarchy (platform → company → depot) | ~75% | 1–2 | SaaS roadmap Sprint 1–2 |
| Modular monolith modules | ~45% | 2 | rules-engine + signed-storage shared modules |
| Domain events + notifications | ~50% | 2 | Duty publish + role permission audit |
| Customer portal | ~10% | Post-G2 | Defer |
| Maintenance app | ~35% | 2 | Admin maintenance control centre |

---

## 6. Technical debt register (blueprint violations)

| ID | Violation | Blueprint ref | Impact | Priority | Target | Status |
|----|-----------|---------------|--------|----------|--------|--------|
| TD-001 | Mock bootstrap / fixture fallbacks | F-03 | False fleet state | 🔴 | Gate 1 | Done (code) |
| TD-002 | Dual `defects` vs `vehicle_damage_cases` | A §8.6 | Broken damage chain | 🔴 | Gate 1 | Done (prod) |
| TD-003 | Base44 / PHV legacy tree in repo | F-03 | Prod bundle risk | 🟠 | Gate 1 | Done (code) — stubs in prod |
| TD-004 | Client-only dispatch compliance | F-06 | Unsafe assignment | 🔴 | Gate 2 | Done (prod) |
| TD-005 | Journey state machine not server-enforced | F-08 | Duty integrity | 🟠 | Gate 1–2 | Done (prod + Driver UI) — API + `applyDutyNavActionAsync` |
| TD-006 | No application scope middleware | F-01 | Cross-app access | 🔴 | Phase A | Done (prod) |
| TD-007 | Yard local task automation vs UUIDs | A §8.4 | Split brain | 🟠 | Gate 1 | Done (prod) |
| TD-008 | Broad roles only | F-11, E matrix | Over-permissioning | 🟠 | Gate 2 | Done (prod) — matrix UI + PATCH grants |
| TD-009 | Yard outbox without Command handler | F-03 | Local-only yard actions | 🔴 | Gate 1 | Done (prod) |
| TD-010 | PHV jobs dual-write (Supabase + Command) | F-18, §7.2 | Split job truth | Done (code) | Command authoritative; Supabase cache offline-queue only |
| TD-011 | Admin Exceptions/Dispatch inject `EXCEPTION_CATALOG` | F-03 | False control-room state | 🔴 | Exec Gate 0 | Done (code) — catalog default off |
| TD-012 | Admin Messages fail-open to `MOCK_CONVERSATIONS` | F-03 | Fake threads on API error | 🔴 | Exec Gate 0–1 | Done (code) — fail-closed empty + retry banner |
| TD-013 | Admin exception raise/ack client-only | F-03, F-18 | Fake durability | 🔴 | Gate 0 disable → Gate 2 wire | Done (code) — Command `/exceptions` raise/assign/escalate/close/notes; Admin wired |
| TD-014 | Yard equipment seeded on live hydrate | F-03 | False readiness | 🔴 | Exec Gate 0 | Done (code) — command-hub skips seed |
| TD-015 | Yard Upcoming compliance fixtures always on | F-03 | Invented MOT/retorque | 🔴 | Exec Gate 0 | Done (code) — opt-in only |
| TD-016 | Yard North Bolton fixture bay fallback | F-03 | Wrong layout / ops mistakes | 🔴 | Exec Gate 0 | Done (code) — honest empty layout |
| TD-017 | Admin resolve-hub demo seed via `DEV` | F-03 | Live-dev false ledger | 🟠 | Exec Gate 0 | Done (code) — mock flag only |
| TD-018 | Journey preview hardcoded miles/mins | F-03 | Synthetic route facts | 🟠 | Exec Gate 0 | Done (code) — “not calculated” |
| TD-019 | Simulate-driver-report ungated in prod nav | F-03 | Prototype as ops path | 🟠 | Exec Gate 0 | Done (code) — prod gated |
| TD-020 | Admin mock-client static import in live entry | F-03 | Bundle / misconfig blast radius | 🟠 | Exec Gate 0–3 | Partial — dynamic import when `VITE_MOCK_API=true` |
| TD-021 | Cost Control bank implicit `demo_live` | F-03 | Finance demo mistaken for live | 🟠 | Exec Gate 4 | Done (code) — prod requires explicit mode |
| TD-022 | Stale Driver “transport mock-only” docs | F-03 | Gate review false signal | 🟡 | Exec Gate 4 | Done (docs) |
| TD-023 | Scanner / absence-test blind spots | F-03, F-17 | False PASS on F-03 | 🔴 | Exec Gate 3 | Partial — `npm run test:f03-gate0` in CI; expand absence suite still open |
| TD-024 | Implicit Yard mock-auth when Command env missing | F-03 | Accidental mock login | 🔴 | Exec Gate 0 | Done (code) — prod never silent mock |
| TD-025 | Website CRM/email stub returns success | F-03 (sales) | Lost waiting-list evidence | 🟠 | Exec Gate 4 | Done (code) — persist-first (KV/notify); production fails closed without persist; crmSynced/emailDelivered honest |
| TD-026 | Shared BCT layout auto-substitution | F-03 | Fake depot geometry | 🟠 | Exec Gate 4 | Done (code) — map/hub no BCT fallback |
| TD-027 | Compliance / fleet resource write APIs (core inventory Done) | F-18 | Incomplete write surface | 🟠 | Exec Gate 2 | Partial — exceptions, equipment, depot stock, fuel cards, tyres Done; purchasing still open |

_Add rows when discovery finds mock paths, dual writes, or blueprint conflicts._

---

## 7. First 8 weeks (blueprint-aligned)

| Week | Blueprint focus | Outcomes | Part F |
|------|-----------------|----------|--------|
| 1–2 | F-03, A §8.6 damage chain | No Base44 in prod build; damage→yard task; truthful sync | 3, 6 |
| 3–4 | F-15, A §12 offline | Defect/incident/media outbox; reconnect revalidation tests | 15 |
| 5–6 | A §7.2–7.3 gates | Fail-closed sign-on; pilot shift without false synced | 6, 15 |
| **Now** | Gate 1 operator exit + F-03 journey sequence | Wire journey sequence to Command; iOS + on-device UI | 3, 15 |
| 7–8 | Gate 3 prep (after iOS) | Store identity, signing, privacy — only after Gate 1 iOS sign-off | 17 |

---

## 8. Definition of aligned

Veyvio is **aligned to the blueprint for pilot production** when:

1. All 🔴 Part F rules are **Done** or explicitly waived with signed risk acceptance. *(F-04 ops done 25 Jul 2026; F-02/F-03 still Partial for SaaS depth / mock tree retention.)*
2. **Gate 1** exit tests pass ([gate1-pilot-exit-test.md](./gate1-pilot-exit-test.md)). *(Automated + Android handset automation green; iOS + on-device UI rows remain.)*
3. No 🔴 technical debt items remain open. *(TD-001–010 closed in code; attendance mock fallbacks tracked under F-03.)*
4. Driver, Yard, and Command behaviours match Part A §7.1–7.4 for the pilot operator's service types. *(Duty closeout + vehicle swap + job execution on Command for BCT; PHV legacy path still dual-writes.)*
5. Every new feature PR cites blueprint section (e.g. `BP-A-8.3`) in description or alignment table update.

Until then:

> **Operationally strong prototype** — preserve proven UI; close blueprint gaps in data, security, and closed-loop workflows.

---

## 9. Document map

| Document | Role |
|----------|------|
| `docs/blueprint/Veyvio_Combined_Blueprint_v2.0.docx` | **Product authority** (§1–22, F-01–F-35) |
| `docs/blueprint/Veyvio_Combined_Blueprint_1.docx` | Legacy v1.0 (superseded) |
| This file | Gap tracker + phase index |
| [veyvio-production-gates.md](./veyvio-production-gates.md) | Gate tasks, file-level work, live progress |
| [credential-rotation-runbook.md](./credential-rotation-runbook.md) | F-04 rotation + sign-off |
| [gate1-pilot-exit-test.md](./gate1-pilot-exit-test.md) | Gate 1 pilot checklist |
| [veyvio-driver-full-remediation-plan.md](./veyvio-driver-full-remediation-plan.md) | Driver P0–P3 detail |
| [veyvio-multi-tenant-saas-roadmap.md](./veyvio-multi-tenant-saas-roadmap.md) | Tenancy + billing sprints |
| [veyvio-platform-backend-blueprint.md](./veyvio-platform-backend-blueprint.md) | Backend module target (implements Part E) |

---

## 10. Maintenance

Update this file when:

- A Part F rule moves status (with test evidence).
- A technical debt item is closed or discovered.
- Gate exit tests pass (note date + pilot company).
- Blueprint version changes — replace `docs/blueprint/` file and bump version here.

**Owners:** Engineering lead (Part F + gates), Product (Part A acceptance), Security (F-01–04, F-17).
