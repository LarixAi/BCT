# ADR: Driver Operational State Unification

## Status

**Accepted — implementation in progress (foundation landed 2026-07-14).**

Slice progress against definition of done:

| Criterion | Status |
|-----------|--------|
| Screens stop writing mock Map directly | Done (`updateDutyDetail` optimistic only; check flow enqueues) |
| `CommandTransport` mock + HTTP | Done (`getCommandTransport`) |
| Outbox drains via transport + structured reject | Done |
| `vehicle.handback` command | Done |
| Drop-off outcome parity | Done |
| Home CTAs wired | Done |
| Admin/Yard platform event consumers | Done (localStorage bridge) |
| Demo seed production-blocked | Done (`canSeedOperationalDemo`) |
| Unification unit tests | Done |
| Playwright vertical slice | Added (`e2e/ops-journey.spec.ts`) |
| Full normalized `DriverOperationalState` shape | Deferred — Zustand dutyDetails still primary projection |
| Durable projection DB across refresh | Partial — still bootstrap/seed + memory |


## Decision

Veyvio Driver keeps **one authoritative client projection** for operational entities. Screens never mutate duty/journey/stop/passenger objects directly.

```
UI interaction
  → application command
  → local command handler (preconditions)
  → optimistic domain events
  → projection reducer
  → durable outbox (commands, not patches)
  → CommandTransport (Mock | HTTP)
  → server acknowledgement
  → authoritative projection reconciliation
```

Zustand remains the **projection container** (selectors + event projection + outbox status). It is not a domain engine and must not expose arbitrary entity patch APIs to screens.

## Lifecycle invariants (audit — Jul 2026)

See also [11-driver-terminology.md](./11-driver-terminology.md).

1. **Journey complete ≠ handback** — `journey.complete` never implies custody close when another journey remains.  
2. **Duty complete is gated** — `duty.complete` only when journeys, passenger tasks, handback, and critical sync rules pass.  
3. **Exception outcomes hold the stop** — serious pickup/drop-off outcomes → `waiting_for_operations`; do not auto-depart.  
4. **Active journey is explicit** — store/projection carries `activeJourneyId`; UI must not use `runs[0]` as the live journey.

## Why this is P0

Complex live transitions already depend on this substrate:

- Duty acknowledgement → vehicle verify → walkaround clearance → clock-in → journey start  
- Passenger boarding / drop-off → incident / defect → handback → duty complete  

Those transitions cannot safely operate while several client structures can independently write the same duty (Map, Zustand, local patches, demo URL seeds, mock mutation results, component-local state).

Production systems often have multiple *representations*. The hazard is multiple *independent writers*.

## Canonical store shape (target)

```ts
interface DriverOperationalState {
  dutiesById: Record<string, DutyProjection>;
  journeysById: Record<string, JourneyProjection>;
  stopsById: Record<string, StopProjection>;
  passengerLegsById: Record<string, PassengerLegProjection>;
  vehicleSessionsById: Record<string, VehicleUseProjection>;
  checksById: Record<string, VehicleCheckProjection>;
  incidentsById: Record<string, IncidentProjection>;
  defectsById: Record<string, DefectProjection>;

  activeDutyId?: string;
  activeJourneyId?: string;

  outbox: OutboxEntry[];
  sync: SyncProjection;
}
```

No screen retains a separate mutable copy of these entities.

## Command transport contract

Mock and HTTP implementations **must** satisfy the same interface (`@veyvio/ops` `CommandTransport`):

```ts
interface CommandTransport {
  send(command: OfflineCommand): Promise<CommandResult>;
}

type CommandResult =
  | {
      status: "accepted";
      commandId: string;
      aggregateId: string;
      serverVersion: number;
      events: DomainEvent[];
    }
  | {
      status: "rejected";
      commandId: string;
      reasonCode: string;
      currentVersion?: number;
      serverProjection?: unknown;
    };
```

Outbox entries are explicit business commands, for example:

`duty.acknowledge` · `duty.clock_in` · `vehicle.accept_assignment` · `vehicle_check.submit` · `journey.start` · `stop.arrive` · `passenger.board` · `passenger.drop_off` · `defect.report` · `journey.complete` · `vehicle.hand_back` · `duty.complete`

Not generic field patches.

## Dispatcher (single write path)

```ts
async function dispatchOperationalCommand(command: DriverCommand): Promise<void> {
  validateLocalPreconditions(command);
  const optimisticEvents = createOptimisticEvents(command);
  projectEvents(optimisticEvents);
  await outbox.enqueue(command);
  void syncCoordinator.requestSync();
}
```

Replace:

```ts
patchDuty(dutyId, { status: "active" });
```

with:

```ts
dispatchOperationalCommand({
  type: "journey.start",
  commandId: crypto.randomUUID(),
  journeyId,
  dutyId,
  expectedVersion: journey.version,
  occurredAt: new Date().toISOString(),
});
```

## Demo / fixture policy

Opening `/duties/duty_1/journey/active?demo=active` **must not** change operational state in a production-capable build.

Demo scenarios load only through a dedicated fixture boot path, gated to DEV. Route `beforeLoad` must not seed production runtime state.

## Cross-app loop (P0 for production release)

Named Driver events without Yard/Admin consumers are visual integration only. For production release:

| Driver action | Platform consequence |
|---------------|----------------------|
| Defect report | Defects case → readiness recalc → Yard restriction → Maintenance triage → Dispatch risk → Admin audit |
| Vehicle swap | Dispatch exception → suitability → Yard availability → new assignment version → Driver ack → prior custody close |

Until those loops exist, apps remain separate prototypes.

## Home CTA policy (elevatable to P0)

Every prominent Home CTA must do exactly one of:

1. Navigate  
2. Execute command  
3. Open resolution workflow  
4. Disabled with reason  

No empty handlers or placeholder success states. A decorative button is inconvenient; a safety/ops button that appears available but does nothing is dangerous.

## Drop-off parity (P1; SEND / vulnerable passengers)

Pickup and drop-off need equivalent operational depth and structured exceptions (authorised person absent, unsafe location, refusal, incorrect destination, handover delayed, unwell, safeguarding, alternative destination, Ops authorisation).

## Migration approach

1. **Inventory** every duty write — classify DomainCommand / ProjectionUpdate / UIOnly / DemoOnly / InvalidDirectMutation.  
2. **Command definitions** — typed `DriverCommand` union.  
3. **One dispatcher** — screens call only this.  
4. **Events, not patches** — projection via reducer.  
5. **Zustand as projection container** — remove arbitrary screen entity updates.  
6. **Block route-driven mutations** outside DEV fixture boot.

## Definition of done (this slice)

- [ ] One duty representation used by Home, Trips, Duty Hub, Active Journey  
- [ ] Clock-in, journey start, boarding each go through one command  
- [ ] Navigating between screens does not lose state  
- [ ] Refresh restores from local projection database  
- [ ] Replaying the same command does not duplicate effect  
- [ ] No screen directly patches operational entities  
- [ ] Mock and HTTP shares `CommandTransport`  
- [ ] Every optimistic change has pending | confirmed | rejected  
- [ ] Rejected command restores or reconciles the affected projection  
- [ ] Tests show duty / journey / passenger consistency  

## Playwright vertical slice (after unification)

Home → ack → clock-in → verify → passed check → start journey → arrive pickup → board → depart → arrive drop-off → authorised handover → complete journey → hand back → complete duty.

Assert UI **and** canonical store at each stage. Reload after clock-in, after boarding, and after journey completion.

## Adjusted priority

### P0 foundation

1. Unify operational projection  
2. Eliminate direct entity mutations  
3. Command outbox + `CommandTransport`  
4. Versioning, idempotency, reconciliation  
5. Connect Driver events to shared Admin/Yard services  
6. Block demo mutation paths from production builds  

### P1 journey correctness

Wire Home CTAs · drop-off/handover parity · stop/passenger exceptions · Ops acknowledgement · Playwright vertical slice  

### P2 engineering hardening

Business rules out of UI · domain/projection unit tests · Capacitor platform adapters · folder naming · CI architecture checks  

## Write-site inventory (baseline, 2026-07-14)

### Invalid direct mutations (fix first)

| Site | Hazard |
|------|--------|
| `domain/vehicle-check/complete-check-flow.ts` | Patches readiness + duty **before** outbox; also enqueues |
| `platform/dev/seed-active-duty.ts` | Hard-patches in_progress without commands |
| `data/mocks/duties.ts` `setVehicleReadiness` | Exported map writer parallel to command path |

### Dual-write / sync lag

| Site | Hazard |
|------|--------|
| `dutyStore` Map + `useDriverStore.dutyDetails` | Two writers; healed by `mergeLiveDutyIntoMock` / `syncMockDutyDetail` |
| `updateDutyDetail` | Always mirrors into mock Map — any caller writes both |

### Demo route mutation

| Site | Hazard |
|------|--------|
| `journey.active?demo=active` `beforeLoad` | Seeds state on open (DEV-gated today; must stay fixture-only) |

### Gaps vs command set

| Gap | Notes |
|-----|-------|
| Drop-off UI | Navigates; does not enqueue `passenger.outcome` / drop_off |
| Handback | On `journey.complete` payload; **not applied** into duty store |
| Legacy `duty.start` | Still in applicator; no production enqueue |

### Healthy path (keep, converge onto)

`enqueueDriverMutation` → IDB outbox → `processOutbox` → transport → applicator → single projection update.

Today transport is **mock-only**; outbox verbs are command-like (good), not field patches.
