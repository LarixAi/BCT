# Veyvio Blueprint Alignment Plan

**Status:** Active — master index for aligning code to the Combined Blueprint  
**Created:** 24 July 2026  
**Blueprint:** [`docs/blueprint/Veyvio_Combined_Blueprint_1.docx`](../blueprint/Veyvio_Combined_Blueprint_1.docx) v1.0  
**Execution spine:** [veyvio-production-gates.md](./veyvio-production-gates.md) (Gates 1–4)  
**Agent rule:** `.cursor/rules/veyvio-combined-blueprint.mdc`

---

## 1. Purpose

This document is the **hub** that connects the Combined Blueprint to what we build and ship. It does not duplicate the blueprint or the production-gates detail — it tracks **gaps**, **priority**, and **where to work next**.

**Principle:** Blueprint = target state. Production gates = stop-ship sequence. Code changes must close a named gap here or in the gates tracker.

---

## 2. How to use (humans and agents)

1. Pick a blueprint requirement (Part A domain spec, Part E API, or Part F rule).
2. Find its row in §4 (Part F tracker) or §5 (domain alignment).
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
| **J** | Part F rule 17 + Gate 3–4 | Gate 3–4 | Store + pilot launch | Signing, pen test, BCT pilot |

**Current focus:** Gate 2 code-closable work shipped (journey S1–S5 server machine, F-07 override audit, compliance settings, vehicle-reports, fuel/equipment, F-09/10/14/16). Gate 1 iOS physical + on-device UI rows remain operator. Do not prioritise Part C or store marketing until Gate 1 physical iOS sign-off is recorded.

**Last updated:** 25 July 2026 (Gate 2 remainder deployed: F-07/F-08/F-05 depth, vehicle-reports, fuel, domain events, integration keys; CORS OPTIONS regression fixed earlier same day)

### Deploy blocker (operator — not done in code alone)

All rows marked **Done (code)** under `command-api` require:

```bash
cd "Veyvio admin " && npm run backend:deploy
```

Ships: application scopes, defect↔damage link, dispatch gates, offline idempotency, `task.create`, duty lifecycle gates, yard permissions, driver write guards, yard mutation handlers (TD-009), BCT pilot seed, driver `/notifications` scope, roles matrix write, signed storage helper, rules engine entry, override audit, journey start/complete, compliance automation settings, vehicle-reports API, fuel records, domain events, integration API keys.

**Deployed:** 24–25 Jul 2026 — migrations `202607250001`–`202607250006` applied; `command-api` ~1.2 MB live on `qeckgqjrfbdyxchuncdt` (redeployed after Gate 2 remainder + CORS OPTIONS fix).

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
| Gate 2 live smoke | `npm run test:gate2-live` | **PASS** — automation-settings, vehicle-reports hub, overrides, integration keys, templates, reports |
| Tenant isolation + yard live | after Gate 2 redeploy | **PASS** |
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
| TD-005 / F-08 | Duty + journey lifecycle server-enforced | Done (prod) | `duty-lifecycle-gates.ts` + `journey-lifecycle-gates.ts` + `POST driver/journeys/:id/start|complete` |
| TD-001 | Command-first bootstrap | Done (code) | Yard rejects mock cache in production |
| Gate 1 pilot prep | Preflight + BCT runbooks | Done | `gate1-preflight.mjs`, pilot exit docs |
| TD-008 / F-11 | Yard + Command permission matrix | Done (prod read+write) | `listRolesMatrix` + `PATCH settings/roles/:id/permissions` + Admin UI |
| F-12 | Driver write boundary validation | Done (prod) | `driver-write-guards.ts` |
| P0-02 / TD-009 | Yard mutation inventory + handlers | Done (prod) | 26/26 types |
| Gate 1 BCT seed | Pilot driver + duty | Done (prod) | `seed-bct-pilot.ts`, migrations `004`–`005` |
| F-13 | Signed URLs + tenant storage paths | Done (code/prod) | `_shared/signed-storage.ts` + `POST /storage/signed-url` |
| F-05 | Shared rules + compliance engine | Done (prod) | `rules-engine.ts` → `compliance-engine.ts` + `GET/PATCH compliance/automation-settings` |
| F-07 | Overrides never silent | Done (prod) | `override-audit.ts` + `override_audit_events`; assignDuty requires reason when blocked |
| F-09 | Domain events | Done (prod) | `domain_events` + `emitDomainEvent` |
| F-10 | Immutable audit helper | Done (prod) | `audit-service.ts` `writeImmutableAudit` |
| F-14 | Integration API keys | Done (prod) | `integration_api_keys` + settings routes |
| F-16 | Time-boxed support grants | Done (code) | `support-access.ts` revoke/active helpers |
| Gate 2 fleet ops | Vehicle reports, fuel, equipment, timeline WO/RTS, reports telemetry | Done (prod) | `vehicle-reports.ts`, `fuel_records`, equipment checks, projections timeline |

### Next in plan order

| ID | Task | Priority | Notes |
|----|------|----------|-------|
| **Gate 1 iOS** | Physical iOS checklist sign-off | Operator | Android APK + airplane cycle done; iOS still operator |
| **Gate 1 manual UI** | Sync queue / defect→Yard / handback / push on device | Operator | Android app installed; complete UI rows on handset |
| **Gate 3** | Store readiness | Deferred | After Gate 1 iOS + Gate 2 exit acceptance |
| **Part C** | Intelligence | Deferred | Blueprint: not before Gate 2 exit |

### Active work (25 Jul 2026)

| ID | Task | Status | Evidence |
|----|------|--------|----------|
| F-04 | Credential rotation + service role confirm + CI | Done (ops) | Runbook sign-off; GitHub secrets set |
| Gate 1 Android | APK install + airplane cycle | Done (device) | `gate1:device-handset` on `R5GL13DVHCH` |
| Gate 1 iOS | Physical checklist | **Operator** | No iOS device in environment |
| TD-008 | Roles permission write API + UI | Done (prod) | PATCH + `RolesPermissionsPage` toggles |
| F-13 | Tenant signed storage | Done (prod) | `signed-storage.ts` deployed |
| F-05 | Rules + compliance engine | Done (prod) | automation-settings live smoke |
| F-07 | Override audit | Done (prod) | migration `006` + assignDuty override path |
| F-08 / TD-005 | Journey S1–S5 server machine | Done (prod) | journey start/complete handlers |
| Gate 2 §4 | Fleet ops depth | Done (prod) | vehicle-reports, fuel, equipment, reports pack |

---

## 4. Part F — 17 hard rules tracker

Part F defines stop-ship requirements. Status is against **running production behaviour**, not documentation alone.

| ID | Rule | Priority | Status | Gate / workstream | Evidence / gap |
|----|------|----------|--------|-------------------|----------------|
| **F-01** | Deny-by-default; application scopes | 🔴 | Done (prod) | Gate 1, SaaS | `application-scopes.ts`; platform+company COMMAND grant |
| **F-02** | Structural tenant isolation | 🔴 | Partial | Gate 1 P0-03, SaaS S1 | Live isolation smoke pass; SaaS S1 ongoing |
| **F-03** | Remove mock/fallback production behaviour | 🔴 | Partial | Gate 1 P0-01, P0-02, A1 | Yard handlers on prod; Driver Base44 fail-closed |
| **F-04** | Rotate and secure credentials | 🔴 | Done (ops) | Phase A | Rotation script + service role confirmed + CI secrets 25 Jul 2026 |
| **F-05** | Centralise business rules | 🟠 | Done (prod) | Gate 2 §4.3 | `compliance-engine.ts` + automation-settings API; journey rules via F-08 |
| **F-06** | Safety rules as hard gates | 🔴 | Done (prod smoke) | Gate 1 E | VOR assign + ack-before-sign-on live |
| **F-07** | Overrides never silent | 🟠 | Done (prod) | Gate 2 | `override_audit_events` + assignDuty override reason |
| **F-08** | Explicit state machines | 🟠 | Done (prod) | Gate 1–2 | Duty ack→sign-on→sign-off + journey start/complete |
| **F-09** | Material writes produce events | 🟠 | Done (prod) | Gate 2 D | `domain_events` + emit on duty/journey/override/fuel/reports |
| **F-10** | Immutable audit service | 🟠 | Done (prod) | Gate 2 | `audit-service.ts` append-only helper |
| **F-11** | Granular permissions | 🟠 | Done (prod read+write) | Gate 1–2 | Yard gates + Command matrix UI + PATCH grants |
| **F-12** | API boundary validation | 🟠 | Done (prod) | Gate 1 A2 | `driver-write-guards.ts` |
| **F-13** | Secure file/document access | 🟠 | Done (code/prod) | Gate 2 | `signed-storage.ts` + `POST storage/signed-url` |
| **F-14** | Secure API keys/integrations | 🟡 | Done (prod) | Phase A | `integration_api_keys` hashed + create/revoke |
| **F-15** | Offline commands safely revalidated | 🔴 | Done (prod) | Gate 1 B1 | Defect/incident/duty outbox |
| **F-16** | Temporary privileged support access | 🟡 | Done (code) | SaaS S3 | Grant resolve + revoke/active helpers |
| **F-17** | Stop-ship tests in CI | 🔴 | Done (automated) | Gate 1 F | CI + live preflight; iOS physical still required for full Gate 1 exit |

**Part F implementation order (from blueprint):**  
1→4→3→2→5→6→7→8→9→10→11→12→13→14→15→17.

---

## 5. Application alignment (Part A)

### 5.1 Veyvio Driver (Part A §8.3)

| Blueprint capability | Status | Gate | Primary files / notes |
|---------------------|--------|------|------------------------|
| Home: duty, vehicle, depot, countdown | ~85% | 1 | `DriverSupabaseHome.jsx`, bootstrap |
| Vehicle checks + media queue | ~80% | 1 | `DriverWalkaroundFlow.jsx`, outbox done |
| Trips / job execution | ~60% | 1 | `DriverSupabaseJobView.jsx` — server state machine weak |
| Messages + operational comms | ~75% | 1 | Ops outbox done; ack proof partial |
| End shift: mileage, fuel, AdBlue, handback | ~70% | 1–2 | Handback + AdBlue on Command |
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
| Live operations / dispatch | ~50% | 2 | Hard gates live; board UX ongoing |
| Scheduling board | ~40% | 2 | Planned |
| Compliance dashboard | ~55% | 2 | Eligibility + rules engine entry |
| Reporting + vehicle timeline | ~55% | 2 | Reports API, driver telemetry |
| Configuration centre / rules library | ~35% | 2 | Roles matrix UI + write; rules engine module started |

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
| TD-005 | Journey state machine not server-enforced | F-08 | Duty integrity | 🟠 | Gate 1–2 | Done (prod) — duty + journey start/complete |
| TD-006 | No application scope middleware | F-01 | Cross-app access | 🔴 | Phase A | Done (prod) |
| TD-007 | Yard local task automation vs UUIDs | A §8.4 | Split brain | 🟠 | Gate 1 | Done (prod) |
| TD-008 | Broad roles only | F-11, E matrix | Over-permissioning | 🟠 | Gate 2 | Done (prod) — matrix UI + PATCH grants |
| TD-009 | Yard outbox without Command handler | F-03 | Local-only yard actions | 🔴 | Gate 1 | Done (prod) |

_Add rows when discovery finds mock paths, dual writes, or blueprint conflicts._

---

## 7. First 8 weeks (blueprint-aligned)

| Week | Blueprint focus | Outcomes | Part F |
|------|-----------------|----------|--------|
| 1–2 | F-03, A §8.6 damage chain | No Base44 in prod build; damage→yard task; truthful sync | 3, 6 |
| 3–4 | F-15, A §12 offline | Defect/incident/media outbox; reconnect revalidation tests | 15 |
| 5–6 | A §7.2–7.3 gates | Fail-closed sign-on; pilot shift without false synced | 6, 15 |
| **Now** | Gate 2 remainder closed in code | F-07/08/05 depth, vehicle-reports, fuel, F-09/10/14/16; iOS operator residual | 5, 7, 8, 9, 10, 14 |
| 7–8 | Gate 3 prep (after iOS) | Store identity, signing, privacy — only after Gate 1 iOS sign-off | 17 |

---

## 8. Definition of aligned

Veyvio is **aligned to the blueprint for pilot production** when:

1. All 🔴 Part F rules are **Done** or explicitly waived with signed risk acceptance. *(F-04 ops done 25 Jul 2026; F-02/F-03 still Partial for SaaS depth / mock tree retention.)*
2. **Gate 1** exit tests pass ([gate1-pilot-exit-test.md](./gate1-pilot-exit-test.md)). *(Automated + Android handset automation green; iOS + on-device UI rows remain.)*
3. No 🔴 technical debt items remain open. *(TD-001–009 closed in code/prod.)*
4. Driver, Yard, and Command behaviours match Part A §7.1–7.4 for the pilot operator's service types. *(Gate 2 fleet ops APIs live; UX depth continues.)*
5. Every new feature PR cites blueprint section (e.g. `BP-A-8.3`) in description or alignment table update.

Until then:

> **Operationally strong prototype** — preserve proven UI; close blueprint gaps in data, security, and closed-loop workflows.

---

## 9. Document map

| Document | Role |
|----------|------|
| `docs/blueprint/Veyvio_Combined_Blueprint_1.docx` | **Product authority** (Parts A–F) |
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
