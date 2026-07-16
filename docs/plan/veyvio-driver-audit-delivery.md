# Veyvio Driver — Audit delivery plan

**Status:** In progress (S0–S5 started 2026-07-14)  
**Source:** Driver app audit verdict (Jul 2026)  
**Depends on:** [ADR 09 ops domain](../architecture/09-ops-domain-model.md), [ADR 10 operational state](../architecture/10-driver-operational-state.md), [11 terminology](../architecture/11-driver-terminology.md)

### Progress log

| Slice | Status |
|-------|--------|
| S0 glossary + ADR invariants | Done |
| S1 activeJourneyId + two-journey fixture | Done (store + duty_1 return journey) |
| S2 journey end ≠ handback | Done (confirm branches; completeEndJourney) |
| S3 duty completion gate | Done (`canCompleteDuty` + hub UI + mock reject) |
| S4 exception → Waiting for Ops | Done (pickup/drop-off + mock stop status) |
| S5 stop kinds + demo gates + ops contacts | Done |
| P1 durable break/note/delay outbox | Done (`journey.break.*`, `journey.note.add`, `delay.report`) |
| P1 messages persist + read≠ack | Done (localStorage; mark-read does not acknowledge) |
| P1 Home CTA honesty | Done (hrefs + disabled reasons) |
| P2 Trips→Duties rename | Done for tab label; URL still `/trips` |

## Goal

Make Driver **production-safe** and **terminology-consistent** without rewriting the shell.

Order of work (audit-aligned):

1. **Lifecycle & safety first** (Duty → Journey → Stop → Passenger task → Handback)  
2. **Durable commands** (breaks, notes, delays, messages, swap)  
3. **Naming & polish** (Duties tab, copy, titles, miles/km)

Do **not** rename UI globally before the lifecycle model is correct — that creates another conflicting workflow.

---

## Canonical terminology (platform-wide)

| Term | Meaning | Driver-facing? |
|------|---------|----------------|
| **Duty** | Full period of work for a driver | Yes — schedule, prep, complete |
| **Journey** | One vehicle movement inside a duty | Yes — start / live / complete |
| **Route** | Geographical stop sequence | Yes — nav & overview |
| **Stop** | Pickup, drop-off, depot, break, waypoint | Yes — live nav |
| **Passenger task** | Pickup or drop-off responsibility | Yes — passenger workflow |
| Assignment | Office allocates work | Admin primarily |
| Run | Scheduling grouping | Backend / Admin (`runId` OK internally) |
| Trip | Passenger’s booked movement | Passenger / booking context |

**Driver mental model:** Duty → Journey → Route → Stop → Passenger task

Internal IDs (`runId`, `assignmentId`, `tripId`) may remain; they must not appear as primary Driver wording.

---

## Current ground truth (code)

| Issue | Where today |
|-------|-------------|
| Tab label **Duties** (URL still `/trips`) | `BottomNav` / `navigation-items.ts` — P2 URL migration still open |
| Duty strip = Duty/Journey/… | `DutySubnav.tsx` (audit’s “Next” already partially replaced by Hub) |
| Journey end forces handback | `journey.end.confirm.tsx` + `completeEndJourney` dispatches `vehicle.handback` then `journey.complete` |
| Duty complete while `in_progress` | `_app.duties.$dutyId.index.tsx` — no gate |
| Exception outcomes advance route | `nav.arrive.tsx` / `nav.dropoff.tsx` → mostly `/nav/depart` |
| Single-journey assumption | Widespread `runs[0]` / `primaryJourneyId ?? runs[0]` |
| No `activeJourneyId` in store | `store/driver.ts` — ADR 10 deferred |
| Demo controls on ops screens | verify, swap, nav.stops (not all DEV-gated) |
| Break / note not persisted | journey.break / journey.note — navigate only |
| Delay not in outbox | creates platform event; missing from `offline-commands` TYPE_MAP |

---

## Phase 0 — Spec lock (short)

**Deliverables**

1. Save audit + this plan under `docs/` (this file).  
2. Add glossary page: `docs/architecture/11-driver-terminology.md` pointing Admin/Yard/Driver at the table above.  
3. Extend ADR 10 with explicit invariants:
   - Completing a journey ≠ ending vehicle custody  
   - Completing a duty requires completion gate  
   - Exception passenger outcomes → `waiting_for_operations`  
   - Active journey selected from lifecycle, never assumed `runs[0]`  

**Exit:** Team agrees Phase 1 slice order; no large UI rename yet.

---

## Phase 1 — P0 operational safety (must before production)

### 1A. Active journey model

**Work**

- Add to driver projection / store: `activeJourneyId`, `activeStopId`, helpers `getActiveJourney(duty)`, `getNextJourney(duty)`.  
- Replace `duty.runs[0]` call sites in nav, delay, swap, open/end journey, duty hub.  
- Seed/fixtures: at least one **duty with two journeys** for demos and e2e.

**Exit:** Multi-journey duty can start journey 2 without pretending journey 1 is still `runs[0]`.

### 1B. Decouple journey complete from handback

**Work**

- Split end-journey wizard: readings + confirm → `journey.complete` only.  
- After complete: branch UI  
  - if `nextJourneyId` → Start next journey / Return to depot journey  
  - else → End-of-duty checks → Vehicle handback → Clock out → Duty complete  
- Remove copy “Close custody of vehicle before ending journey” when another journey remains.  
- Keep `vehicle.handback` as its own command at custody end only.

**Files (start):** `journey.end.*`, `store/driver.ts` `completeEndJourney`, mocks `journey.complete` / `vehicle.handback`.

**Exit:** Second journey on same vehicle works without handback; handback only when custody ends.

### 1C. Duty completion gate

**Work**

- Domain: `canCompleteDuty(duty, sync)` — journeys done, passenger tasks final (or Ops-cleared), depot return if required, end mileage, handback, critical sync accepted, clock-out.  
- Hide/disable Complete duty until gate passes; show blockers in operational language.  
- Mock + eventual server reject for early `duty.complete`.

**Exit:** Cannot complete duty from hub while journeys/handback incomplete.

### 1D. Passenger exception → Waiting for Operations

**Work**

- Classify outcomes: safe terminal vs **exception** (unsafe to board, refused, unreachable, authorised person absent, drop-off refused, safeguarding, etc.).  
- Exception: stop status `waiting_for_operations`; **block** navigate to depart / next stop.  
- UI: “Waiting for Operations” with Call Ops / escalate; continue only via Ops resolve, authorised rule, or audited override.  
- Authorised-person-absent must **never** count as successful handover.

**Files:** `nav.arrive.tsx`, `nav.dropoff.tsx`, `@veyvio/ops` passenger outcomes, mocks `passenger.outcome`.

**Exit:** e2e — exception outcome stays on stop; depart blocked until override/Ops.

### 1E. Stop types (no default-to-pickup)

**Work**

- Typed stops: depot departure, passenger pickup/drop-off, operational waypoint, driver break, fuel, vehicle-change, depot return.  
- Nav router opens the matching service workflow; unknown/depot never uses passenger `"unknown"` pickup path.

**Exit:** Depot/operational stop cannot enter passenger pickup outcome sheet by default.

### 1F. Demo / simulate controls

**Work**

- Gate every demo affordance with `canSeedOperationalDemo()` (or equivalent) — hide in production builds.  
- Includes: Demo mismatch, Simulate arrival, Ops identify/approve replacement, Mark check complete demo, Reset prep.

**Exit:** Production/mobile build has zero driver-facing simulate-Ops controls.

### 1G. Emergency & Operations contacts (central)

**Work**

- Single helpers: `callEmergency999()`, `callOperations()`.  
- Wire all inactive Call 999 / Call Operations surfaces.  
- Safeguarding send → incident workflow, not plain chat.

**Exit:** Smoke matrix — every Help/Incident/Messages entrypoint dials or opens the same tested path.

---

## Phase 2 — P1 durable workflows

| Workflow | Target |
|----------|--------|
| Break | Commands start/end; persisted elapsed; safe-location/passenger rules; resume journey |
| Journey note | `journey.note.add` → outbox |
| Delay | One `delay.report({ dutyId, journeyId, stopId, … })` from Home, Journey, Messages, duty details |
| Vehicle replacement | Platform state machine (not page-local); no demo Ops approve in prod |
| Messages | Persist offline; Send/safeguarding/Call Ops wired; **read ≠ acknowledged** |
| Vehicle check evidence | Real camera/QR where Capacitor allows; sync states: Draft → Submitted locally → Waiting → Received → Accepted / Needs review / Rejected (never “Synced” on outbox-only) |
| Home CTAs | Only show enabled buttons with real destinations; else disabled + reason |

---

## Phase 3 — P2 naming & polish

Do after Phases 1–2 for the surfaces touched, or in a dedicated rename PR after 1A–1B land.

| Current | Target |
|---------|--------|
| Trips (tab + section) | **Duties** (route can stay `/trips` briefly with redirect, or move to `/duties` list carefully) |
| DutySubnav Hub | **Duty** |
| What’s next? | Duty overview + Next action section |
| Open journey / Journey opened | Start journey / Journey started |
| Complete trip / trip history | Complete duty / Duty history |
| Emergency report (generic) | Initial incident report |
| Running late | Report delay |
| Driver Focus Mode | Driving mode |
| Keep Awake | Keep screen awake |
| Company (driver UI) | Operator where transport-facing |
| km vs mi | `distanceUnit` from company/vehicle config (UK default `mi`) |
| Page titles | Every operational route via `driverPageTitle()` |

Update brand docs (`docs/brand/veyvio-driver-*`) when tab label changes.

---

## Recommended Driver page map (target IA)

Keep five main tabs; grow duty area under Duty:

```
Main:     Home · Duties · Checks · Messages · More
Duty:     Overview · Prep · Vehicle verify · Vehicle check · Readiness
Journey:  Start · Live route · Stop · Passengers · Vehicle · Issues · Help
Close:    Journey complete · Next journey · Return to depot
          End-of-duty checks · Handback · Duty complete
More:     Profile · Operator/depot · Documents · Training · Driving mode
          Sync · Security · Help · Legal · Sign out
Safety:   Incident · Safeguarding · Defect · Delay · Replacement
          Diversion · Off-route · Passenger exception · Emergency
```

---

## Delivery slices (suggested sprints)

| Slice | Focus | Approx. |
|-------|--------|---------|
| **S0** | Glossary + ADR 10 invariants + this plan accepted | 0.5 day |
| **S1** | 1A activeJourneyId + two-journey fixture + replace `runs[0]` | 2–3 days |
| **S2** | 1B journey end ≠ handback + branch UI | 2–3 days |
| **S3** | 1C duty completion gate | 1–2 days |
| **S4** | 1D exception outcomes / Waiting for Ops | 2–3 days |
| **S5** | 1E stop types + 1F demo gates + 1G contacts | 2–3 days |
| **S6** | P1 breaks / notes / delay outbox | 3–4 days |
| **S7** | P1 swap machine + messages persistence | 3–5 days |
| **S8** | P1 check evidence + Home CTA honesty | 2–3 days |
| **S9** | P2 rename Trips→Duties + copy pass + units + titles | 2–3 days |

Adjust after S1 once multi-journey fixtures expose more call sites.

---

## Testing strategy

- **Unit:** `canCompleteDuty`, outcome classification, journey-vs-handback branching, stop-type router.  
- **Unification:** extend `ops-unification.test.ts` for multi-journey + exception hold.  
- **e2e:**  
  1. Two-journey duty: complete J1 → start J2 → no handback until end  
  2. Exception pickup → blocked depart  
  3. Production build: demo buttons absent  
  4. Duty complete disabled until gate  

---

## Explicit non-goals (this programme)

- Cloning rideshare / Uber chrome  
- Full server projection DB (still ADR 10 deferred) — gates can be client+mock first, server-backed next  
- Renaming Admin “assignment/run” APIs  
- Yard Teal on Driver UI  

---

## First engineering move (next PR)

**Slice S1:** introduce `activeJourneyId` (+ selectors), two-journey demo duty, eliminate critical `runs[0]` paths in open/end/nav/delay.

Then **S2** handback decoupling — highest production risk after multi-journey support exists.

---

## Decision checklist (confirm before coding)

- [ ] Accept terminology table for Driver + Yard + Admin copy  
- [ ] Accept phase order (lifecycle before rename)  
- [ ] UK default distance unit: `mi` (configurable)  
- [ ] Route path: keep `/trips` URL with Duties label first, or migrate URL in S9  
- [ ] Start with S1 active journey model as next PR  
