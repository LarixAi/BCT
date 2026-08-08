# F-03 Full Mock Replacement Plan

**Status:** Exec Gate 0–1 Done (code) · Exception writes Done · Equipment + depot stock + fuel cards + tyres Done (code) · Compliance due-item read + website persist-first Done (code) · Purchasing + quarantine still open  
**Authority:** Combined Blueprint v2.0 §18 F-03, F-18, F-32; platform first → workflows → screens  
**Date:** 8 August 2026  
**Companion:** [veyvio-blueprint-alignment-plan.md](./veyvio-blueprint-alignment-plan.md) · [veyvio-production-gates.md](./veyvio-production-gates.md)

**Done means:** Designed → Implemented → Integrated → Tested → Deployed → Verified (no % completion as evidence).

---

## Locked decisions

| # | Question | Decision |
|---|----------|----------|
| D1 | Exceptions raise/ack | **Read-only** until Command has a real write service. No client-only ack/raise. |
| D2 | Upcoming compliance | **Honest empty/unavailable** until the authoritative compliance due-item feed exists. No temporary second compliance engine. |
| D3 | Admin mock-client | **Keep for Playwright through Gate 3**; remove static production imports **now**; later consider MSW. |

Architecture principle: **platform first, workflows second, screens third.**

---

## Delivery sequence (execution gates)

| Exec gate | Name | Outcome |
|-----------|------|---------|
| **Gate 0** | Truth Safety | Admin catalog, Messages fallback, Yard equipment/Upcoming/bay fallback removed; fail closed everywhere affected. |
| **Gate 1** | Live Read Models | Exceptions, Dispatch, Messages, Yard equipment/layout/compliance consume authoritative APIs **or** honest unavailable/empty. |
| **Gate 2** | Live Writes | Exception ack/resolve, equipment assignment, yard layout management — server-side with audit. |
| **Gate 3** | Enforcement | CI scanners, production config tests, fail-closed integration tests, import restrictions. |
| **Gate 4** | Cleanup | Quarantine/remove legacy mock trees, Cost Control hardening, BCT template conversion, docs. |

Map to blueprint production gates: Exec Gate 0–1 → blueprint Gate 1 F-03; Exec Gate 2–3 → Gate 1–2; Exec Gate 4 → post-pilot / Gate 3 prep.

---

## Phase 0 — Stop fake operational truth immediately

**Safety pass only.** Do not build replacement functionality yet; first make every affected screen fail closed.

### Admin

| # | Action |
|---|--------|
| 0.A1 | Set Exceptions `includeCatalog: false` outside explicit mock/test mode (default false; prod pages never pass true). |
| 0.A2 | Remove catalog-only Dispatch exceptions from production. |
| 0.A3 | Remove `MOCK_CONVERSATIONS` fallback from Messages. |
| 0.A4 | Messages API failure → visible error state + retry action + **zero** fake conversations. |
| 0.A5 | Disable raise/acknowledge controls if there is no authoritative write API (D1). |
| 0.A6 | Remove resolve-hub demo fallbacks from production paths (`DEV` alone must not seed). |
| 0.A7 | Remove hardcoded journey preview distance/duration where presented as actual route facts. |

### Yard

| # | Action |
|---|--------|
| 0.Y1 | Stop `mergeEquipmentForVehicles()` from injecting default equipment into live vehicle records. |
| 0.Y2 | Stop `build-upcoming-feed.ts` from adding synthetic MOT, retorque, inspection, or compliance items. |
| 0.Y3 | Remove North Bolton fixture bay fallback from live hub rendering. |
| 0.Y4 | Missing layout → honest **“No yard layout configured”**. |
| 0.Y5 | Missing equipment → empty equipment state (**“No equipment recorded for this vehicle.”**). |
| 0.Y6 | Missing compliance data → **“Compliance schedule unavailable/not configured”**. |
| 0.Y7 | Gate `simulate-driver-report` behind explicit dev/test environment conditions. |
| 0.Y8 | Remove implicit mock-auth fallback caused by missing Command URL / anon key (fail build/startup instead). |

### Gate 0 acceptance

> Production builds must never turn an empty API response or API failure into believable operational data.

---

## Phase 1 — Define authoritative sources

Before replacing anything, maintain this source-of-truth matrix. Every UI fact must answer the five questions below.

### Source-of-truth matrix

| Domain | Authoritative owner | Read source | Write source |
|--------|---------------------|-------------|--------------|
| Vehicles | Command | Command vehicle API | Command |
| Drivers | Command | Command driver API | Command |
| Dispatch | Command | Dispatch API | Command |
| Exceptions | Command | Exception API | Command |
| Messages | Command/Comms | Messaging API | Messaging service |
| Yard layout | Yard/Command config | Layout API | Admin/Yard config |
| Equipment | Yard | Equipment API | Yard |
| Compliance due items | Compliance engine | Compliance API | Engine/workflow |
| MOT dates | Vehicle/compliance record | Vehicle API | Authorised admin process |
| Retorque | Maintenance | Maintenance API | Maintenance |
| Journey metrics | Routing provider | Routing calculation API | Generated result |
| Finance | Cost Control | Finance/bank API | Cost Control |
| CRM leads | Website CRM | CRM API | Website/CRM |

### Five questions (per UI fact)

1. Where did this fact come from?  
2. When was it last refreshed?  
3. What happens if the source is unavailable?  
4. Who is permitted to alter it?  
5. Is the result auditable?

If any answer is **“fixture”**, **“seed”**, **“fallback”**, or **“we calculate something representative”**, that path must not masquerade as live.

---

## Phase 2 — Admin replacement

### 2.1 Exceptions

**Current problems:** seed catalog merged into live inbox; Dispatch derives exceptions from catalog; raise/ack mutate client state only.

**Read model (target):**

```
GET /exceptions
  filters: depot, vehicle, driver, severity, status, source, date range
  provenance: source, sourceRecordId, createdAt, updatedAt
```

**Write model (eventually):**

```
POST /exceptions
POST /exceptions/:id/acknowledge
POST /exceptions/:id/resolve
→ immutable audit entries
```

**Until writes exist:** screen is **read-only** (D1). Safer than fake acknowledgement.

Compose from live mapped sources only (alerts, defects, incidents, yard exceptions, eligibility/release) **or** dedicated Exception API when shipped — never `EXCEPTION_CATALOG` in production.

### 2.2 Dispatch

Consume actual live reasons, e.g.:

- no suitable driver  
- vehicle unavailable  
- compliance blocked  
- depot mismatch  
- scheduling conflict  
- VOR  
- missing documentation  

No fixture catalog.

| State | Copy |
|-------|------|
| No active exceptions | “No current dispatch exceptions.” |
| Exception service fails | “Dispatch exception data is currently unavailable.” |

Those states must remain distinct.

### 2.3 Messages

Production behaviour:

```
Loading → live conversations | empty → API error (+ retry)
```

Never:

```
API error → believable demo conversations
```

If messaging not configured yet: retain page shell; show **“Messaging has not been configured”**; optionally disable compose.

Mock conversations allowed only in: Storybook, Playwright fixtures, dedicated demo builds, local explicit mock mode.

### 2.4 Journey preview

Remove `12.4` miles / `48` min unless calculated.

Introduce a route-estimate interface, e.g.:

```
JourneyEstimate
  distanceMetres
  durationSeconds
  calculatedAt
  provider
  routeVersion
```

Until routing is wired: **“Route estimate not calculated.”**  
Do not show placeholders formatted as real results.

---

## Phase 3 — Yard replacement

Yard is operational and safety-sensitive.

### 3.1 Equipment

Remove automatic first-aid / fire-extinguisher / kit injection.

Equipment must exist as actual records, for example:

```
equipment
  id, companyId, depotId, vehicleId?
  type, serialNumber?, status
  inspectionDueAt?, expiryAt?, assignedAt?, lastVerifiedAt?
```

If none exists: **“No equipment recorded for this vehicle.”**  
That state may create a real compliance/readiness warning — it must **not** fabricate equipment to make the vehicle look complete.

### 3.2 Upcoming compliance

Proper due-item contract (future):

```
ComplianceDueItem
  id, entityType, entityId, category
  dueAt, warningAt, severity
  sourceRecordId, status, title, description
```

Sources may include: MOT, vehicle inspection, retorque, licence checks, insurance, service, defect follow-up, equipment expiry, driver compliance.

**Gate 1 behaviour (D2):** honest empty/unavailable until the service exists. Do not build a temporary second compliance engine unless there is an immediate operational need.

### 3.3 Yard layout

Remove North Bolton fallback entirely for production.

```
requested depot layout
       ↓
layout exists? ─ yes → render
       ↓ no
“No yard layout configured”
```

Not: missing → North Bolton fixture.  
Fake bay layout can cause real operational mistakes.

---

## Phase 4 — Environment and authentication hardening

Mock mode must never happen accidentally.

### Runtime modes

```
VEYVIO_RUNTIME_MODE=production
VEYVIO_RUNTIME_MODE=development
VEYVIO_RUNTIME_MODE=test
VEYVIO_RUNTIME_MODE=demo
```

| Mode | Mock API | Fixture fallback | Demo auth | Seeded ops |
|------|----------|------------------|-----------|------------|
| **production** | Prohibited | Prohibited | Prohibited | Prohibited |
| **development** | Real API by default; mock only explicit opt-in | Prohibited as silent fill | Opt-in only | Opt-in only |
| **test** | Deterministic fixtures permitted | Permitted in tests | Permitted | Permitted |
| **demo** | Synthetic permitted | Permitted | Permitted | Permitted + prominent DEMO badge; isolated from prod tenancy |

Missing required environment configuration in production must **terminate startup/build**, not silently enable mock behaviour.

---

## Phase 5 — Mock-client containment

Do **not** delete the ~3.7k-line Admin mock client yet (D3).

| Step | Action |
|------|--------|
| 5.1 | Remove static production import. |
| 5.2 | Dynamically import only when explicit mock/test mode is enabled. |
| 5.3 | Prohibit mock-client import from production application modules. |
| 5.4 | Keep available for Playwright until replacement coverage is mature. |
| 5.5 | Eventually migrate test mocking to MSW or request interception (after Gate 3). |

Changing test infrastructure during production-truth cleanup is out of scope for Gate 0–1.

---

## Phase 6 — Cost Control

Reasonably gated today; still fix:

| Rule | Requirement |
|------|-------------|
| Bank mode | Prefer explicit `BANK_MODE=demo` \| `BANK_MODE=live` (or equivalent). Never implicit `demo_live` if developers may believe data is real. |
| Demo UX | Obvious visual badge in demo mode. |
| Production | `BANK_MODE` must equal `live`, or service fails closed. |
| Auth / finance adapters | Same fail-closed rule. |

---

## Phase 7 — Website

Illustrative/demo product UI is acceptable (not operational truth).

CRM/email is different:

```
submission received
  ↓
persist internally first
  ↓
CRM/email integration attempted
  ↓
integration result logged
```

Do **not** return success merely because a stub executed.

User submission persistence is authoritative even when downstream CRM/email delivery fails (pre-launch waiting-list evidence).

---

## Phase 8 — Shared spatial template

BCT geometry must not silently function as the real depot.

Keep as: layout template · onboarding starter · test fixture.

Onboarding flow (allowed):

```
“Start from BCT-style template”
  → clone into depot-specific layout
  → new immutable IDs
```

Never automatically substitute BCT geometry for a missing tenant layout.

---

## Phase 9 — CI production-truth scanner

Build fails if production code contains known mock-injection patterns.

### Token / symbol scan (examples)

- `MOCK_CONVERSATIONS`  
- `includeCatalog: true`  
- `mergeEquipmentForVehicles`  
- `fixtures.ts` / `*-fixtures`  
- `seedCatalog` / `demoSeed`  
- `mockClient` / `VITE_MOCK_API` (prod profile)  
- `simulate-driver-report` (ungated)  
- North Bolton / hardcoded journey duration/distance  

Do **not** rely only on the word “mock”.

### Behavioural pattern scan (examples)

```ts
catch { return fixtureData; }
return live.length ? live : demo;
const rows = [...apiRows, ...seedRows];
if (!config) return mockConfig;
```

### Separate scanners

1. Fixture imports  
2. Fail-open fallbacks  
3. Injected operational records  
4. Demo auth  
5. Hardcoded operational metrics  
6. Forbidden production environment flags  

---

## Phase 10 — Test the absence of fake truth

Explicit absence tests (more valuable than filename scans alone):

| Case | Expect |
|------|--------|
| Admin Messages — API 500 | Error UI; zero conversation rows |
| Admin Exceptions — API `[]` | Empty inbox; `CAT-*` never appears |
| Yard equipment — zero equipment | Zero items; first-aid kit not created |
| Upcoming — compliance API `[]` | No due rows; MOT/retorque fixtures absent |
| Yard map — no layout | Empty/configuration state; North Bolton bays absent |
| Production config — Command URL missing | Init/build fails; mock login does not appear |

---

## Phase 11 — Provenance in the UI

For important records, retain metadata:

- source service  
- last synced timestamp  
- originating depot  
- authoritative record ID  

Not every page needs full provenance chrome. Prefer detail/debug surfaces such as:

- “Last updated from Command at 09:42”  
- “Compliance status calculated 8 August 2026, 09:37”  

Supports audit and incident debugging.

---

## Phase 12 — Mock quarantine

After critical replacement work, synthetic operational data lives only under:

```
/tests/fixtures
/tests/mocks
/demo
/storybook
```

Production directories contain **no** operational fixtures.

Architectural rule (eslint / CI):

> Production components cannot import from `/mocks`, `/fixtures`, `/seed`, or `/demo`.

---

## Debt register (alignment plan §6)

| ID | Violation | Target exec gate | Priority |
|----|-----------|------------------|----------|
| TD-011 | Admin Exceptions/Dispatch inject `EXCEPTION_CATALOG` | Gate 0 | 🔴 |
| TD-012 | Admin Messages fail-open to `MOCK_CONVERSATIONS` | Gate 0 | 🔴 |
| TD-013 | Admin exception raise/ack client-only | Gate 0 (disable) → Gate 2 (wire) | 🔴 |
| TD-014 | Yard equipment seeded on live hydrate | Gate 0 | 🔴 |
| TD-015 | Yard Upcoming compliance fixtures always on | Gate 0 | 🔴 |
| TD-016 | Yard fixture bay fallback (North Bolton) | Gate 0 | 🔴 |
| TD-017 | Admin resolve-hub demo seed via `DEV` | Gate 0 | 🟠 |
| TD-018 | Journey preview hardcoded miles/mins | Gate 0 | 🟠 |
| TD-019 | Simulate-driver-report ungated in production nav | Gate 0 | 🟠 |
| TD-020 | Mock-client static import in Admin live entry | Gate 0–3 | 🟠 |
| TD-021 | Cost Control bank implicit `demo_live` | Gate 4 | 🟠 |
| TD-022 | Stale Driver “transport mock-only” docs | Gate 4 | 🟡 |
| TD-023 | Scanner / absence-test blind spots | Gate 3 | 🔴 |
| TD-024 | Implicit Yard mock-auth when Command env missing | Gate 0 | 🔴 |
| TD-025 | Website CRM/email stub returns success | Gate 4 | 🟠 |
| TD-026 | Shared BCT layout auto-substitution | Gate 4 | 🟠 |
| TD-027 | Exception / compliance / equipment write APIs absent | Gate 2 | 🟠 |

---

## Verification matrix (cross-phase)

| Check | Pass criteria |
|-------|----------------|
| Gate 0 smoke | Empty/fail API never shows catalog, demo messages, seeded kit, MOT fixtures, or Bolton bays |
| Gate 1 read | Each domain answers the five questions without fixture/seed/fallback masquerading as live |
| Gate 2 write | Ack/resolve/assign/layout mutations produce Command audit; UI never “succeeds” locally only |
| Gate 3 CI | Scanners + absence tests red on regression |
| Gate 4 cleanup | Quarantine paths only; Cost Control / website / BCT template rules enforced |

---

## Product copy (operational)

| Situation | Copy |
|-----------|------|
| No layout | “No yard layout configured” |
| No equipment | “No equipment recorded for this vehicle.” |
| No compliance feed | “Compliance schedule unavailable/not configured” |
| No dispatch exceptions | “No current dispatch exceptions.” |
| Dispatch exceptions unavailable | “Dispatch exception data is currently unavailable.” |
| Messages not configured | “Messaging has not been configured” |
| Messages load failed | Visible error + retry (no demo fill) |
| Route estimate missing | “Route estimate not calculated.” |

Avoid: “API unavailable”, “mutation failed”, silent demo fill.

---

## First PR slice (Gate 0)

1. Admin: catalog default off; Dispatch no catalog; Messages fail-closed + retry; raise/ack disabled; resolve-hub mock-only; journey preview “not calculated”.  
2. Yard: no equipment inject; no compliance fixtures; no bay fallback; simulate gated; fail closed on missing Command env.  
3. Minimal absence tests for Messages 500, Exceptions empty, equipment empty, Upcoming empty, layout missing.  
4. Point F-03 rows in gates + alignment plan at this document.

Estimated: 1–2 engineer-days for Gate 0 safety pass.
