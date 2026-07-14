
# Vehicle Equipment & Stock System — Yard Prototype

Frontend-only extension of Veyvio Yard. No backend, no auth. All data lives in the existing Zustand store and fixtures.

## Core UX decision

Instead of adding tabs or extra buttons inside the existing `/yard/$vehicleId` page, tapping a vehicle card anywhere in the app now opens a **dedicated full-screen Equipment & Stock page**:

```
/yard/$vehicleId/equipment
```

- Vehicle cards on Home, Yard Inventory, Departure Line, and VOR routes route here on tap.
- A small "Vehicle detail" secondary link stays available inside the equipment page header, so the existing status/history page is not lost.
- The equipment page is the primary "what should this vehicle carry, what's on it, what's missing, can it leave" surface.

## Page structure (single scrollable page, no tabs)

```text
┌─────────────────────────────────────────────────────┐
│  ← Yard    A01 · SK23 FGH · MINIBUS · Bay A01       │
│  Status chip · Fuel · Last check · Vehicle detail › │
├─────────────────────────────────────────────────────┤
│ READINESS BANNER                                    │
│  READY / READY WITH WARNINGS / RESTRICTED /         │
│  DEPARTURE BLOCKED / VOR                            │
│  14 of 16 requirements complete                     │
│  1 safety-critical · 1 low-stock warning            │
│  [ Resolve Issues ]                                 │
├─────────────────────────────────────────────────────┤
│ ACTION BAR (sticky bottom on mobile)                │
│  [ SCAN ] [ ASSIGN ] [ RESTOCK ] [ REPORT ISSUE ]   │
├─────────────────────────────────────────────────────┤
│ SECTION · FIXED EQUIPMENT                           │
│  Fire Extinguisher 1   Present   Expires 12 Sep 27  │
│  First Aid Kit         Expiring  21 days            │
│  Glass Hammers         4/4                          │
│  Wheelchair Lift       Passed                       │
│  Row actions: Report missing · Report damaged ·     │
│               Replace · Send for inspection         │
├─────────────────────────────────────────────────────┤
│ SECTION · ASSIGNED (REUSABLE) EQUIPMENT             │
│  WCS-014  Wheelchair Set   Complete 6/6             │
│  WCS-022  Wheelchair Set   Incomplete 5/6 (Clamp 4) │
│  CS-008   Child Seat       Assigned                 │
│  Row actions: Unassign (reason required)            │
├─────────────────────────────────────────────────────┤
│ SECTION · CONSUMABLES                               │
│  Gloves          8 / 20    LOW      [Restock]       │
│  Cleaning Wipes  0 / 2     MISSING  [Restock]       │
│  Face Masks     10 / 10    Complete                 │
├─────────────────────────────────────────────────────┤
│ SECTION · DOCUMENTS & CONTROLLED ITEMS              │
│  Fuel Card FC-113  Present                          │
│  Vehicle Keys      Issued to J. Miller              │
│  Defect Book       Present                          │
├─────────────────────────────────────────────────────┤
│ SECTION · AUDIT (last 10 equipment events)          │
└─────────────────────────────────────────────────────┘
```

Vehicle Inventory card gets a compact readiness line only — no clutter:
```
Equipment: 18/18 Complete
Equipment: 2 missing · wipes, gloves low
Equipment: Safety failure · restraint incomplete
```
Colored by state (green/amber/orange/red/grey/purple).

## What we build in stage 1 (this turn's scope)

Following the doc's staged rollout, this plan implements **Stage 1 + the compact readiness indicator + the new dedicated page**. QR scanning, offline sync, admin config, dispatch integration, and reporting are deferred.

Included:
- Equipment catalogue with the three categories (Fixed, Reusable/kit, Consumable) + Documents.
- Vehicle requirement templates: Standard Minibus, WAV Minibus, School, Coach.
- Kits with components (wheelchair restraint set = 4 clamps + occupant belt + restraint).
- Readiness computation folded into the existing `recomputeTrip` pipeline and surfaced on cards.
- Assign / Unassign (with reason + destination), Restock, Report Issue (missing / damaged / expired / inspection).
- Fixed-equipment controlled actions (Report missing, Report damaged, Replace, Send for inspection) — no plain Unassign.
- Immutable audit log per vehicle.
- Severity → outcome mapping (Warning, Restock, Restricted, Blocked, VOR-recommended, Auto-VOR) reusing the current `raiseVorFromDefect` path.
- Simulated "Scan" via a picker sheet (no camera).

Deferred (call out in UI as coming soon where relevant): live camera scanning, depot stock ledger UI, inspection scheduler, driver app view, admin template editor, dispatch eligibility, offline queue.

## Technical outline

New/changed files:

- `src/types/equipment.ts` — new domain types:
  `EquipmentDefinition`, `EquipmentAsset`, `EquipmentKitComponent`, `VehicleEquirementTemplate`, `VehicleEquipmentRequirement`, `EquipmentAssignment`, `ConsumableStockLine`, `ConsumableTransaction`, `EquipmentAuditEvent`, `EquipmentStatus` enum, `Criticality`, `DepartureRule`, `ReadinessState`.
- `src/data/equipment-fixtures.ts` — catalogue, templates, kits, per-vehicle assignments + consumables + documents, seeded audit.
- `src/store/yard.ts` — extend store:
  - state: `equipmentDefs`, `equipmentAssets`, `assignments`, `consumables`, `documents`, `requirements` (resolved per vehicle via template), `equipmentAudit`.
  - actions: `assignAsset`, `unassignAsset(reason, destination)`, `restockConsumable`, `reportEquipmentIssue`, `replaceFixedItem`, `sendForInspection`, `clearEquipmentIssue`.
  - selector: `getVehicleReadiness(vehicleId)` returning `{ state, missing[], warnings[], restrictions[], counts }`.
  - hook `recomputeTrip` to also read equipment readiness as a blocker.
- `src/routes/yard.$vehicleId.equipment.tsx` — the new dedicated page (route param same as existing detail route, extra segment).
- `src/components/yard/equipment/` — new folder:
  - `ReadinessBanner.tsx`
  - `EquipmentActionBar.tsx` (Scan / Assign / Restock / Report Issue)
  - `FixedSection.tsx`, `AssignedSection.tsx`, `ConsumablesSection.tsx`, `DocumentsSection.tsx`, `AuditSection.tsx`
  - `KitRow.tsx` with component breakdown
  - `EquipmentReadinessChip.tsx` for vehicle cards
- `src/components/yard/sheets.tsx` — add sheets:
  `assign-equipment`, `unassign-equipment`, `restock-consumable`, `report-equipment-issue`, `replace-fixed`, `scan-simulator`.
- `src/components/yard/primitives.tsx` — `VehicleCard` gains an `EquipmentReadinessChip` and its `onClick`/link target changes to `/yard/$vehicleId/equipment`.
- Add nav entry (or keep implicit via card taps). Existing `/yard/$vehicleId` remains reachable via header link "Vehicle detail".

### Readiness rule engine (pure function)

Input: vehicle + resolved requirements + current fixed items + assignments + consumables.
Output per requirement: `ok | warn | restrict | block`.
Aggregation:
- any `block` → `DEPARTURE BLOCKED` (and, if requirement's departure rule is `auto-vor`, call `raiseVorFromDefect` on a synthetic defect).
- any `restrict` → `RESTRICTED SERVICE` with the restricted service tags surfaced.
- any `warn` → `READY WITH WARNINGS`.
- else → `READY`.
- VOR status always trumps to `VOR`.

This state feeds:
- Vehicle card badge.
- Trip `blockers` (adds "Equipment non-compliant" / "Restricted service").
- Departure Line readiness.

### Route + navigation changes

- New file `src/routes/yard.$vehicleId.equipment.tsx` with `createFileRoute("/yard/$vehicleId/equipment")`.
- `VehicleCard` links change from `to="/yard/$vehicleId"` to `to="/yard/$vehicleId/equipment"` across Home, Yard, Departure Line, VOR.
- Existing `/yard/$vehicleId` detail page stays; add a "View equipment" primary CTA at top and reciprocal "Vehicle detail" link on the new page.

## What we're intentionally NOT doing

- No backend, no Lovable Cloud, no persistence beyond the in-memory store.
- No real QR camera; the Scan button opens a picker of eligible assets.
- No admin template editor UI (templates live in fixtures; easy to edit later).
- No offline queue, no multi-tenant scoping, no permissions matrix — single implicit "yard manager" role.
- No dispatch/job compatibility screen, no reporting dashboards.

## Verification

- `tsgo --noEmit` clean.
- Playwright walkthrough: open a vehicle from Home → land on equipment page → restock wipes → readiness flips from warning to ready; report missing clamp on WCS-022 → kit becomes Incomplete → vehicle shows Restricted for wheelchair service; report safety-critical fire extinguisher fault → departure blocked and VOR case appears on `/vor`.
- Screenshot the new page at the current viewport (658×794) to confirm the layout works at tablet width.
