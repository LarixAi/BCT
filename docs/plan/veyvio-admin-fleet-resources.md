# Veyvio Fleet Resources & Operating Costs (Admin plan)

## Product name

**Fleet Resources** — shared ledger for fuel, energy, fluids, tyres, parts, equipment, cards, stock, purchases, and vehicle operating costs.

Not a dumping ground of expense forms. One accountable journey per litre, tyre, part, card, and piece of equipment: purchase/receipt → assignment/use → return/disposal.

## Why it exists

Operators must answer: which vehicle used it, who authorised it, mileage at the time, was usage reasonable, where is the removed tyre, cost per mile, is stock disappearing, should cost be charged to customer/insurer/employee?

Four purposes:

1. **Operational readiness** — vehicle has what it needs for the duty  
2. **Safety & compliance** — tyres, fluids, equipment safe  
3. **Financial control** — spend, VAT, approvals, recovery  
4. **Asset accountability** — who received, fitted, moved, disposed  

## Ownership boundaries (do not blur)

| Domain | Owns |
|--------|------|
| **Fleet Resources** | Catalogue, transactions ledger, stock movements, tyres-as-assets, equipment inventory, fuel cards, purchases/approvals, resource costs, resource analytics |
| **Maintenance** | Work orders, labour, parts *required/fitted* (consumes Resources ledger), schedules |
| **Vehicle Checks** | Driver observations (low AdBlue, tyre concern) — creates/links Resources events |
| **Defects** | Fault lifecycle; may trigger part/tyre demand |
| **Inspections** | Formal measurements & outcomes; may record tyre/fluid evidence |
| **Yard** | Physical issue/receive, equipment scan, depot dispense, preparation levels |
| **Vehicles** | Master record + embedded panels (tyres, fuel, equipment, costs) — not a second ledger |
| **Drivers / Trips / Depots** | Context + assignment; Resources links to them |
| **Reports / Audit** | Consume ledger; immutable audit for movements |

**Rule:** Other modules create or consume resource records. They must not maintain separate stock or cost databases.

## Admin placement

**Nav (People and Fleet):** Drivers · Staff · Vehicles · Depots · Yard Operations · **Fleet Resources** · Maintenance  

**Route:** `/fleet-resources`

**Hub tabs (Phase 1 shell — keep lean):**

| Tab | Purpose |
|-----|---------|
| Overview | Attention cards + alerts + depot stock snapshot + upcoming demand |
| Fuel & Energy | Fuel/EV transactions, anomalies, receipts |
| Fluids | AdBlue, oil, coolant, screenwash, etc. |
| Tyres | Register + fitted map (Phase 2 depth) |
| Stock | Parts/consumables movements + low stock |
| Cards | Fuel/purchasing cards |
| Purchasing | Requests, approvals (light) |
| Costs | Vehicle / depot spend, cost per mile |
| Analytics | Efficiency & exceptions (grows Phase 3) |
| Settings | Policies, thresholds, categories |

Defer as separate top-level tabs until volume justifies: Equipment (fold into Stock Phase 1), Suppliers (link Maintenance + Purchasing), Transactions (filterable register under Overview or Fuel).

### Vehicle detail add-ons (not duplicate ledgers)

Vehicle tabs gain: **Tyres · Fuel & Energy · Equipment · Costs** (panels that query Fleet Resources by `vehicleId`).

## Shared domain model (core)

### Resource catalogue item

`category` · `sku` · `name` · unit · safetyCritical · reorderLevel · compatibleVehicleClasses · storageHints  

Categories: `fuel` | `adblue` | `electricity` | `tyre` | `fluid` | `part` | `consumable` | `equipment` | `cleaning` | `safety_equipment` | `accessibility_equipment` | `card`

### Resource transaction (one ledger)

```
id, companyId, depotId?
resourceCategory, resourceItemId?
transactionType  // purchase | issue | return | transfer | fit | remove | top_up | dispense | adjust | dispose | …
quantity, unit, unitPrice, vat, gross
vehicleId?, driverId?, staffId?, supplierId?
tripId?, dutyId?, workOrderId?, defectId?, inspectionId?, purchaseRequestId?
odometer?, location?, evidence[]
status: draft → submitted → pending_approval → approved | rejected | queried → reconciled | exported | cancelled
costCentre?, allocation targets[]
createdBy, approvedBy, audit
```

**Stock quantity is never edited directly** — current stock = sum of movements.

### Tyre asset (Phase 2)

Identity (internal ID, DOT, size, brand) · status · fitment history · tread/pressure inspections · disposal.

### Fuel / purchasing card

Masked number · assignment model (vehicle | driver | depot) · limits · status · last transaction.

## Overview attention cards (Phase 1)

Low fuel · Low AdBlue · Missing receipts · Suspected card misuse · Tyres needing attention · Low depot stock · Unapproved purchases · Missing equipment · Resource-related blocks · Spend this month · Cost per mile this month

Panels: Resource alerts · Upcoming demand (from schedule) · Depot stock status table · Exceptions queue

## Cross-app wiring ✅ Phase A implemented

| App | Capability | Status |
|-----|------------|--------|
| **Driver** | Record fuel / AdBlue on journey (`/duties/$dutyId/journey/fuel`) via `resource.transaction.record` offline command | ✅ |
| **Yard** | Completing `refuel` / `check_fluids` / `replenish_equipment` writes ledger dispense/issue | ✅ |
| **Admin** | Policies, approvals, anomalies, costs, audit | ✅ |
| **Maintenance** | Adding WO parts writes resource `issue` with `workOrderId` | ✅ |
| **Live API** | `GET /fleet-resources/hub` → `projectFleetResourcesHub` stub | ✅ (deploy required) |

Still later: receipt camera capture, equipment QR scan UI, fuel-card confirm, Driver report-low-fluid deep link into Checks.

## Readiness gate (shared)

Resources feed `VehicleReadiness` blockers/warnings:

- Insufficient fuel for planned duty  
- AdBlue warning  
- Unsafe tyre  
- Missing wheelchair restraints / extinguisher / first-aid  
- Charge insufficient  
- Critical fluid leak unresolved  

Decisions: READY · READY WITH WARNING · CONDITIONALLY READY · BLOCKED — always with reason, source, owner, override rules.

## Phased delivery (recommended)

### Phase 1 — Core records ✅ implemented

- Resource catalogue (seed: diesel, AdBlue, key fluids, common parts)  
- Shared transaction model + mock API + live resolve fallback  
- Admin hub: Overview · Fuel & Energy · Fluids · Stock · Cards · Purchasing · Costs · Settings  
- Fuel + AdBlue transaction entry (Admin panel; Driver/Yard deep links later)  
- Receipt metadata stub  
- Vehicle cost ledger aggregation (fuel + fluids)  
- Nav + Vehicle Fuel & Costs panel  
- Purchase approve (no self-approval)  

### Phase 2 — Tyres & equipment ✅ implemented

- Individual tyre register + vehicle position map  
- Fit / remove / rotate + re-torque link to existing wheel retorque  
- Equipment QR-style IDs + vehicle assignment  
- Stock transfers + receive  
- Inspection / defect deep-links  

### Phase 3 — Operational intelligence ✅ implemented

- Fuel anomaly engine (capacity, MPG, odometer regression)  
- Consumption baselines  
- Low-stock forecast from recent usage  
- Resource readiness gate wired into Dispatch vehicle selection  
- Tyre wear / alignment recommendations  

### Phase 4 — Integrations ✅ stubbed

Fuel-card providers · telematics · accounting · supplier invoices · EV charging · depot dispensers (Admin Integrations tab)

### Phase 5 — Advanced finance ✅ stubbed

Budgets · cost centres · whole-life / replacement analysis (Admin Finance tab) 

## Admin implementation sketch (Phase 1 files)

```
src/lib/fleet-resources/
  types.ts          // catalogue, transaction, card, stock, hub
  constants.ts
  aggregate.ts      // buildFleetResourcesHub()
  fuel-rules.ts     // capacity / anomaly stubs
  seed.ts
src/features/fleet-resources/
  FleetResourcesPage.tsx
  OverviewTab.tsx
  FuelEnergyTab.tsx
  FluidsTab.tsx
  StockTab.tsx
  CardsTab.tsx
  CostsTab.tsx
  SettingsTab.tsx
  RecordTransactionPanel.tsx
docs/plan/veyvio-admin-fleet-resources.md  (this file)
```

Nav: `navigation.ts` + `modules.ts`  
API: `getFleetResourcesHub`, mock + real stub with empty/projected hub  
Vehicle: compact Fuel & Costs panels  

## Key design principles

1. **One ledger** — fuel, AdBlue, tyres, parts share the transaction spine  
2. **Movement-based stock** — no silent quantity overwrites  
3. **Evidence before assumption** — receipts, photos, odometer  
4. **Exceptions before routine** — Overview is attention-first  
5. **Recorder ≠ approver** — no self-approval  
6. **Modules connect, don’t duplicate** — Maintenance consumes; Resources owns inventory cost  

## Success metrics (Phase 1)

- Every fuel/AdBlue entry linked to vehicle + (where known) driver + odometer  
- Missing-receipt queue visible  
- Depot AdBlue/oil stock levels visible  
- Cost-per-mile panel on vehicle and hub Costs tab  
- No crash when live API omits optional settings fields (general hardening)  

## Out of scope for Phase 1

Full tyre asset lifecycle, QR equipment scanning, fuel-card ISO integration, accounting export, ML forecasting, drag-drop stock bay UI.
