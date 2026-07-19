# Veyvio Command — Live Operations

## Core principle

Live Operations converts live Driver and Yard events into clear operational decisions: what happened, who is affected, how serious it is, what action is available, who owns it, and whether the action worked.

The **Control centre** answers overall health. **Live Operations** shows what is happening now.

## MVP shipped

Route: `/live-operations`

| Capability | Notes |
|------------|--------|
| Control bar | Date, clock, last update, search, pause/resume polling, saved views, active/completed |
| Summary cards | Active runs/trips, service health, drivers, exceptions — cards **filter the board** |
| Live map | Existing `LiveVehicleMap`; collapsible; stale GPS filter |
| Operations board | Runs / trips tabs with delay and next action |
| Exception queue | Critical → urgent → warning from dashboard alerts, eligibility/release exceptions, and live delay/stale signals |
| Activity feed | Operational stream derived from live runs + exceptions |
| Run detail drawer | Overview, timeline, exceptions, actions |
| Actions | Message driver / Yard (links), Manage assignment (vehicle swap + trip transfer with existing validation), create exception, motion-safe call guidance |
| Offline / stale | Connection banner; per-run stale location warnings; “silence ≠ no activity” |

### Code map

- States: `src/lib/live/canonical-trip-states.ts`
- Model: `src/lib/live/live-operations.ts`, `build-live-operations.ts`
- UI: `src/features/live-operations/*`

## Later phases (from product brief)

- Dedicated live APIs (`/live-operations/summary`, projections, event stream)
- Predictive delay / recovery suggestions
- In-page message compose with delivery/ack
- Full passenger journey board with SEND flags under permission
- Resizable panel chrome
- Granular `live_operations.*` permissions
- Cancellation / abort flows with onboard safety gates
- Immutable `trip_events` as source of truth across apps

## Shared trip states

Lifecycle and exception states are defined in `canonical-trip-states.ts` so Admin does not invent free-text statuses. Transitions should come from events or authorised actions.
