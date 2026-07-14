# Phase 2 — Operations Dashboard

## Scope (Sprint 1)

Phase 2 extends the authenticated yard app with operational visibility and workflows beyond the Phase 1 foundation (auth, sync skeleton, permissions).

### Delivered

- **Yard map** (`/yard/map`) — live bay occupancy by zone; tap a bay to open vehicle equipment
- **Arrivals** (`/arrivals`) — record returning off-site vehicles into parking bays
- **Departure staging** — stage blocked trips to the departure line from the departure board
- **Richer home board** — attention strip, zone occupancy, quick links (map, arrivals, scan)
- **Domain helpers** — `src/features/yard/yard-map.ts` (occupancy, empty bays, attention items)

### Workflows

| Workflow | Entry | Action |
|----------|-------|--------|
| Arrival | Home → Arrivals, or More → Arrivals | Pick vehicle + empty parking bay → `moveVehicle` with `Return from off-site` or `Move to parking` |
| Stage departure | Departure line → Stage on blocked row | Pick empty D-bay → `moveVehicle` with `Move to departure line` |
| Yard map | Home → Yard map, Yard inventory → Map | Visual occupancy; links to equipment page |

Mutations enqueue to the offline outbox (Phase 1) when session/tenancy context is present.

## Not yet implemented

- Drag-and-drop bay assignment on the map
- Real QR/camera for arrival scan
- Dispatch integration (auto-notify when vehicle staged)
- Arrival/departure SLA timers and alerts

## Phase 2 Sprint 2

### Delivered

- **Departure release checklist** — ready trips must pass checklist before release (`departure-release` sheet)
- **Driver handover screen** — live fleet snapshot, notes, `completeHandover` with outbox sync
- **Domain repository split** — `src/domain/yard/` (`bay-zones`, `trip-readiness`, `kpi`, `departure-checklist`, `handover-summary`)

### Workflows

| Workflow | Entry | Action |
|----------|-------|--------|
| Release departure | Departure line → Release on ready trip | Checklist gate → `releaseForDeparture` → `departure.release` outbox |
| Shift handover | More → Shift & handover | Notes + Complete → `handover.complete` outbox |

## Next recommended steps

1. **API layer** — replace mock bootstrap/outbox with real endpoints
2. **Phase 3** — tasks module with assign/complete workflow
3. **Further repository split** — extract equipment mutations from Zustand store
