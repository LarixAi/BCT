# ADR: Operational domain model (Duty / Journey / Assignment)

**Status:** Accepted  
**Date:** 2026-07-13  
**Context:** Distinguished engineering review of Veyvio Driver workflow

## Decision

Driver, Admin, and Yard share one operational vocabulary. Screens may remain as they are; **commands and state machines** own transitions. URLs and mocks must not invent operational state.

## Entities

| Entity | Meaning |
|--------|---------|
| **Booking** | Commercial / customer transport request |
| **PassengerLeg** | One passenger’s pickup-to-drop-off movement |
| **Journey** | One operated vehicle movement containing stops |
| **Run** | Operational grouping or repeating pattern of journeys |
| **Duty** | The driver’s work period containing one or more journeys |
| **Assignment** | Allocation of driver and vehicle to a duty or journey |
| **VehicleUseSession** | Custody window for a vehicle under a driver assignment |

## Journey identity (UI must not invent names)

Every journey screen receives a single identity payload:

```ts
{
  journeyId: string;
  runId: string;
  runCode: string;       // e.g. "RUN-104-AM"
  displayName: string;   // e.g. "School Route 104 – Morning Run"
  version: number;
}
```

## Commands (Driver-facing)

| Command | Aggregate | Notes |
|---------|-----------|-------|
| `acknowledgeDuty` | Duty | Review instructions / version |
| `clockInDuty` | Duty | Fit-for-duty declaration; **not** journey start |
| `acceptVehicleAssignment` | VehicleUseSession | Confirm reg / QR |
| `submitVehicleCheck` | VehicleUseSession | Canonical check only |
| `startJourney` | Journey | Requires duty already clocked in / active |
| `completeJourney` | Journey | Returns to Duty Hub if more journeys remain |
| `handBackVehicle` | VehicleUseSession | Post-use custody |
| `completeDuty` | Duty | After handback or formal transfer |

### Critical invariant

**`startJourney` must never silently call `clockInDuty` or `startDuty`.**

A duty may contain several journeys. Opening one journey must not mark the entire duty complete, and must not pretend a duty start.

## State machines (summary)

### Duty

`assigned → delivered → acknowledged → clocked_in → active → close_required → completed`

Also: `blocked`, `cancelled`, `transferred`, `suspended`.

### Vehicle-use session

`assigned → accepted → verified → checking → released → in_use → handback_required → returned`

Also: `held`, `VOR`, `swap_required`.

### Journey

`scheduled → released → ready → in_progress → completed`

Also: `cancelled`, `aborted`, `transferred`, `partially_completed`.

## Vehicle readiness (not a global boolean)

```ts
type VehicleReadiness = {
  vehicleId: string;
  assignmentId: string;
  checkSessionId: string;
  status: "required" | "in_progress" | "held" | "released";
  validFrom: string;
  validUntil?: string;
  invalidationReason?: string;
};
```

A check for one vehicle must never release another.

## Check outcomes

- `RELEASED_NO_DEFECTS`
- `RELEASED_WITH_ACCEPTED_DEFECTS`
- `HELD_PENDING_REVIEW`
- `VOR`
- `CHECK_SUBMISSION_PENDING_SYNC`

Driver fitness declaration is separate and belongs at duty clock-in.

## Package

Canonical types and transition guards live in `shared/veyvio-ops` (`@veyvio/ops`).

## Consequences

- Open Journey wizard ends with `journey.start`, not `duty.start`.
- Duty Hub clock-in uses `duty.clock_in` only.
- Duty Hub must not host an independent walkaround; it resumes the canonical check session.
- Demo / auth bypasses are DEV-only and must not force production state via URL.
