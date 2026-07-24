# Live Yard Map — Product & Technical Plan

**Feature:** Live Yard Map  
**Status:** Phase 1 in progress  
**First tenant:** Brent Community Transport (`veyvio@outlook.com` project)  
**First depot:** BCT Main Depot (`BCT-MAIN`) — 26 numbered bays  

**North star:** The Yard app opens to a live interactive depot map that mirrors the real yard. Every bay updates in real time.

---

## 1. Tenancy

```
Veyvio Platform
└── Company (company_id UUID)
    └── Depot (BCT Main Depot)
        └── Yard Layout (Main Depot Parking Map)
            ├── Versions (immutable when published)
            ├── Zones (pedestrian, roadway, buildings, restrictions)
            ├── Bays 1–26
            └── LIFO groups
```

All records carry `company_id`. JWT `active_company_id` + RLS `user_has_company()`. Never trust client-supplied `companyId`.

---

## 2. Data model (summary)

| Table | Purpose |
|-------|---------|
| `yard_layouts` | Layout container per depot |
| `yard_layout_versions` | Immutable published snapshots |
| `depot_zones` (extended) | Polygons, colours, access rules |
| `parking_bays` (extended) | Geometry, status, LIFO, QR token |
| `vehicle_locations` | One active location per vehicle |
| `lifo_groups` | LIFO stack definitions |
| `bay_reservations` | Reserved bays |
| `yard_issues` | Hazards pinned to map |
| `yard_movements` (extended) | Structured from/to bay FKs |
| `yard_exceptions` | Conflicts, blocked departures |

### Bay status vs location confidence

**Bay status:** available · occupied · reserved · blocked · out_of_service · temporary_closure · maintenance_use · unknown

**Location confidence:** confirmed · driver_reported · yard_confirmed · gps_estimated · unverified · missing · outside_marked_bay · in_transit · off_site

---

## 3. BCT Main Depot layout

26 numbered parking bays traced from the physical depot plan:

| Area | Bays |
|------|------|
| Bottom-right grid (4 columns) | 1–12 |
| Centre bottom row | 13–15 |
| Far bottom left | 16 |
| Left vertical stack | 17–20 |
| Middle left | 21, 22–24 |
| Top centre | 25–26 |

**LIFO + Reserve:** Bay 10, Bay 15  
**Gates:** Top-right entrance; bottom-centre entrance & exit  
**Buildings:** Main portacabin (top), Portacabin 1 (mid-left), Container (bottom-left)  
**Zones:** Pedestrian walkways, traffic flow, no-parking hatched areas  

---

## 4. Vehicle readiness (map markers)

Always show reg + status label + icon (never colour alone).

Ready · Assigned · Departing soon · In service · Returned · Awaiting check · Cleaning · Fuel · AdBlue · Defect · Restricted · VOR · Maintenance · Inspection due · Missing · Unavailable

---

## 5. Client architecture

```
src/features/yard-map/
├── LiveYardMap.tsx
├── layouts/bct-main-depot.ts
├── hooks/useMapViewport.ts
├── components/  (ParkingBayShape, MapControls, MapLegend, MapListView)
└── drawers/     (BayDetailDrawer, VehicleDetailDrawer)
```

SVG viewBox map — not a geographic map. Photo is tracing reference only.

---

## 6. API endpoints (target)

| Method | Route |
|--------|-------|
| GET | `/depots/:depotId/yard-layout` |
| GET | `/depots/:depotId/yard-state` |
| GET | `/yard/hub` (extended) |
| POST | `/vehicles/:vehicleId/movements` |
| POST | `/driver/vehicle-parked` |
| POST | `/bays/:bayId/reservations` |
| POST | `/yard-layouts/:layoutId/publish` |

---

## 7. Integration matrix

| Module | Phase |
|--------|-------|
| Yard map UI + bays | 1 |
| Live vehicle locations + movements | 2 |
| Driver end-of-shift parking | 3 |
| LIFO, morning mode, capacity | 4 |
| Reservations, issues, handover | 5 |
| Maintenance, defects, dispatch | 6 |
| ANPR, geofence, analytics | 7 |

---

## 8. Implementation phases

### Phase 1 — Digital map foundation ✅

- [x] Plan document (`docs/plan/live-yard-map.md`)
- [x] DB migration (`202607240001_live_yard_map.sql`)
- [x] BCT seed migration (`202607240002_bct_yard_layout_seed.sql`)
- [x] BCT SVG layout seed (26 bays + zones) — `shared/veyvio-yard/`
- [x] `LiveYardMap` component (zoom, pan, layers)
- [x] Map + list views on `/yard/map`
- [x] Bay / vehicle detail drawers + move vehicle action
- [x] Map legend + layer toggles
- [x] Admin view-only spatial map (`YardSpatialMapTab`)
- [ ] On-site validation sign-off

### Phase 2 — Live vehicle locations (in progress)

- [x] `vehicle_locations` table + hub loader
- [x] `yard/hub` returns `yardLayout`, `depotCode`, bay on vehicles
- [x] Movement route upserts `vehicle_locations`
- [x] Bootstrap + store carry layout metadata
- [x] 10s map refresh hook (Realtime bridge)
- [ ] Supabase Realtime subscriptions
- [ ] Full move workflow audit trail in UI

**Acceptance:** All 26 bays interactive; empty/occupied/reserved/blocked states; accessible list alternative.

### Phase 2 — Live vehicle locations

`vehicle_locations`, hub extension, realtime, move workflow, audit.

### Phase 3 — Driver return integration

Parking screen, QR scan, `POST /driver/vehicle-parked`, sign-off gate.

### Phase 4 — Operational intelligence

Morning mode, LIFO conflicts, overnight planning, capacity dashboard.

### Phase 5 — Yard control

Reservations, blocking, issues, shift handover.

### Phase 6 — Full integration

Maintenance, cleaning, fuel, defects, dispatch.

### Phase 7 — Advanced automation

ANPR, geofencing, predictive planning.

---

## 9. Acceptance criteria (v1)

1. 26 interactive bays  
2. Bay states: empty, occupied, reserved, blocked  
3. One active location per vehicle  
4. One vehicle per single-capacity bay  
5. Driver parking at shift end (Phase 3)  
6. Yard staff confirm/correct (Phase 2)  
7. Every move audited (Phase 2)  
8. Map updates across Yard + Admin (Phase 2)  
9. Dispatcher sees bay (Phase 2)  
10. LIFO conflicts detected (Phase 4)  
11. Offline sync safe (Phase 2–3)  
12. Tenant isolation tests pass  
13. Accessible list alternative  

---

## 10. On-site validation (before publish)

Walk-through checklist: bay numbers, orientation, LIFO groups, gates, pedestrian routes, no-parking zones, workshop boundaries.

---

*See conversation plan for full specification (40 sections). Migration: `Veyvio admin /supabase/migrations/202607240001_live_yard_map.sql`.*
