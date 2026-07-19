# Veyvio Yard — Departure bay free + next-day operational plan

**Status:** Phase 1 in progress (2026-07-16)  
**Decision:** Driver journey start frees the bay, with Yard **Confirm left** as manual fallback.

## Phase 1 — Vehicle leaves → bay empty (implemented / wiring)

| Step | Behaviour |
|------|-----------|
| Stage | Vehicle moved to departure-line bay |
| Release | Authority to leave — bay still occupied |
| Depart | Driver `journey.started` **or** Yard **Confirm left** |
| Effect | Vehicle `Off-site`, movement `Departed for service`, physical bay empty on Yard map |
| Audit | Outbox `departure.complete` + movement history |

**Key files**

- `src/domain/yard/departure-exit.ts`
- `src/store/yard.ts` → `departVehicleForService`
- `src/features/yard/yard-map.ts` → off-site vehicles do not occupy bays
- `src/platform/ops/ingest-driver-ops-events.ts` → consumes `journey.started`
- `shared/veyvio-ops/events.ts` → Yard is a `journey.started` consumer
- `src/routes/_app.departure-line.tsx` → Confirm left + Departed section

## Phase 2 — Admin publishes next-day duties + yard order (planned)

Admin publishes a versioned **Operational day plan** (`src/types/plan.ts`):

- Duties (linked duty/trip/vehicle/driver)
- Staging sequence (order vehicles should be prepared)
- Optional target bays and notes

**Publish path (planned)**

1. Admin Schedule/Dispatch → **Publish to yard**
2. Event `plan.published` (Yard + Driver consumers)
3. Yard bootstrap carries `operationalPlan`
4. Yard Home / `/plan` shows tomorrow’s staging order and creates prep tasks

**Permissions (planned):** Admin `plan.publish` · Yard `plan.view` · optional Yard lead `plan.acknowledge`

## Open items

- Shared duty/trip IDs across Admin · Driver · Yard
- Bootstrap schema bump when plan payload ships
- Idempotent double-depart (release + journey start) — already keyed by `departedAt` / off-site status
