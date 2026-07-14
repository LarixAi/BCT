# Veyvio Yard — Product Boundary

## Standalone product
- **Product name:** Veyvio Yard
- **Parent brand:** Veyvio
- **Descriptor:** Fleet readiness and yard operations
- **Product promise:** Know the yard. Control the day.
- **Campaign line:** Every vehicle. Ready and accounted for.
- **Master tagline:** Move smarter. Operate safer.
- **Brand foundation:** [docs/brand/veyvio-yard-brand-foundation.md](../brand/veyvio-yard-brand-foundation.md)

## Independence
Veyvio Yard is an independently installable operational application. It does not require Driver, Customer, or Admin frontends.

## Platform integration
Yard integrates with the wider Veyvio platform through secure APIs and events (e.g. `vehicle.vor.marked` blocks dispatch allocation).

## Current implementation status (Phase 3)
- Phase 1–2 complete: auth, sync, permissions, yard map, arrivals, departure release, handover
- Tasks module: accept, assign, complete with offline queue
- See [05-phase-3-tasks.md](./05-phase-3-tasks.md)

## Previously (Phase 2 Sprint 1)
- Phase 1 complete: auth flow, sync skeleton, permissions, outbox mutations
- Yard map, arrivals workflow, departure staging, richer home dashboard
- See [04-phase-2-operations.md](./04-phase-2-operations.md)

## Previously (Phase 1 Sprint 1)
- Public entry flow: splash → welcome → sign-in → MFA → company → depot → initial sync
- Authenticated shell with bottom navigation
- Existing yard prototype screens behind `_app` auth guard
- Mock auth and tenancy (localStorage persistence)

## Not yet implemented
- Real API backend
- Offline outbox / IndexedDB
- Native mobile shell (Capacitor)
- Production permission enforcement server-side
