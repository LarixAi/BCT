# Veyvio Admin — Operational Control Centre

## Design principle

Show the **operational outcome and the next action**—not statistics, not protected detail.

The Admin home answers four questions immediately:

1. Are today’s drivers ready?
2. Are today’s vehicles ready?
3. Are trips running safely and on time?
4. What needs admin action now?

## MVP shipped (this slice)

Replaces Overview (`/`, nav label **Control centre**) with a composed dashboard from existing hubs:

| Widget | Sources |
|--------|---------|
| Driver readiness + blocked reasons | Driver directory summary, eligibility exceptions, duties |
| Vehicle readiness (Yard / Driver check / Released) | Yard hub, checks hub, vehicle summary, duties |
| Readiness pipeline with blocker text | Duties + yard readiness/tasks + check release |
| Live trips | Live dispatch |
| Yard snapshot + tasks | Yard hub |
| Vehicle checks | Checks hub |
| Defects and VOR | Defects hub |
| Handover exceptions | Yard exceptions (handover/keys/damage keywords) |
| Sync health | Driver stale sync, check/yard pending sync, live GPS stale |
| Prioritised action queue | Dashboard alerts + exceptions + blocking yard tasks + failed checks + critical defects |
| Saved views | Client-side section filters (Morning release, Live service, Yard control, Compliance, End of day) |

Quick actions are **links** into existing modules (same backend validations)—no duplicate mutation logic on home.

### Code map

- Canonical states: `Veyvio admin /src/lib/ops/canonical-states.ts`
- Model + aggregator: `ops-dashboard.ts`, `build-ops-dashboard.ts`
- Safe composition: `src/lib/api/safe-ops-dashboard.ts`, `safeYardHub` / `safeChecksHub` in `safe-hubs.ts`
- UI: `src/features/overview/OverviewPage.tsx`, `ControlCentrePanels.tsx`, `useOpsDashboard.ts`

## Full vision (later phases)

The product brief covers 20 sections. **Not in MVP UI yet:**

- Tomorrow readiness
- Deep end-of-day handback board
- Messages / acknowledgement tracking subsystem
- Live map as primary home surface
- Full passenger medical/safeguarding on home (intentionally never on home)
- Single server `GET /ops-dashboard` projection (compose client-side first; add when shapes stabilize)

## Shared canonical states

Align Admin, Driver, and Yard labels:

- **Driver duty:** PLANNED → … → BLOCKED  
- **Vehicle readiness:** distinguish Yard ready, Driver checked, Operationally released, VOR  
- **Run:** PLANNED → RELEASED → IN_PROGRESS → BLOCKED / COMPLETED  

## Data ownership reminder

| Source | Supplies |
|--------|----------|
| Driver app | Sign-on, checks, defects/damage, trip progress, return, messages |
| Yard app | Location, prep, fuel/charge, equipment, keys, release/receipt, VOR recommendation |
| Admin / backend | Bookings, runs, assignments, eligibility rules, VOR authorisation, alerts |
