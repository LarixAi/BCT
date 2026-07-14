/** Named platform events emitted from the command layer — Driver, Admin, Yard consume the same IDs. */

export type PlatformEventName =
  | "duty.acknowledged"
  | "driver.clocked_in"
  | "vehicle.assignment_accepted"
  | "vehicle.verified"
  | "vehicle_check.submitted"
  | "defect.reported"
  | "vehicle.held"
  | "journey.started"
  | "stop.arrived"
  | "passenger.outcome_recorded"
  | "delay.reported"
  | "journey.break_started"
  | "journey.break_ended"
  | "journey.note_added"
  | "incident.initial_submitted"
  | "vehicle_swap.requested"
  | "vehicle_swap.completed"
  | "journey.completed"
  | "vehicle.returned"
  | "duty.completed"
  | "safeguarding.case_opened";

export type PlatformEventConsumer = "dispatch" | "live_ops" | "yard" | "vehicles" | "defects" | "maintenance" | "audit" | "incidents" | "trips" | "drivers" | "exceptions";

export interface PlatformEvent {
  eventId: string;
  eventType: PlatformEventName;
  occurredAt: string;
  tenantId: string;
  depotId: string;
  actorId: string;
  correlationId: string;
  aggregateId: string;
  aggregateVersion: number;
  payload: unknown;
  consumers: PlatformEventConsumer[];
}

const EVENT_CONSUMERS: Record<PlatformEventName, PlatformEventConsumer[]> = {
  "duty.acknowledged": ["dispatch", "audit"],
  "driver.clocked_in": ["live_ops", "drivers", "audit"],
  "vehicle.assignment_accepted": ["yard", "vehicles", "audit"],
  "vehicle.verified": ["yard", "vehicles", "audit"],
  "vehicle_check.submitted": ["yard", "vehicles", "audit"],
  "defect.reported": ["defects", "maintenance", "vehicles", "audit"],
  "vehicle.held": ["live_ops", "yard", "dispatch", "audit"],
  "journey.started": ["live_ops", "trips", "audit"],
  "stop.arrived": ["live_ops", "trips"],
  "passenger.outcome_recorded": ["trips", "live_ops", "audit"],
  "delay.reported": ["exceptions", "dispatch", "live_ops"],
  "journey.break_started": ["live_ops", "drivers", "audit"],
  "journey.break_ended": ["live_ops", "drivers", "audit"],
  "journey.note_added": ["live_ops", "audit"],
  "incident.initial_submitted": ["incidents", "live_ops", "audit"],
  "vehicle_swap.requested": ["dispatch", "yard", "audit"],
  "vehicle_swap.completed": ["vehicles", "trips", "audit"],
  "journey.completed": ["trips", "live_ops", "audit"],
  "vehicle.returned": ["yard", "vehicles", "audit"],
  "duty.completed": ["drivers", "audit"],
  "safeguarding.case_opened": ["incidents", "audit"],
};

export function createPlatformEvent(input: {
  eventType: PlatformEventName;
  tenantId: string;
  depotId: string;
  actorId: string;
  correlationId: string;
  aggregateId: string;
  aggregateVersion: number;
  payload: unknown;
}): PlatformEvent {
  return {
    eventId: `evt_${crypto.randomUUID?.() ?? Date.now()}`,
    eventType: input.eventType,
    occurredAt: new Date().toISOString(),
    tenantId: input.tenantId,
    depotId: input.depotId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    aggregateId: input.aggregateId,
    aggregateVersion: input.aggregateVersion,
    payload: input.payload,
    consumers: EVENT_CONSUMERS[input.eventType],
  };
}

type PlatformEventListener = (event: PlatformEvent) => void;

/** In-memory event bus for demo cross-app alignment. */
export class PlatformEventBus {
  private events: PlatformEvent[] = [];
  private listeners = new Set<PlatformEventListener>();

  publish(event: PlatformEvent): void {
    this.events.push(event);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        /* consumer failures must not break command apply */
      }
    }
  }

  subscribe(listener: PlatformEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  list(): PlatformEvent[] {
    return [...this.events];
  }

  forAggregate(aggregateId: string): PlatformEvent[] {
    return this.events.filter((e) => e.aggregateId === aggregateId);
  }

  ofType(eventType: PlatformEventName): PlatformEvent[] {
    return this.events.filter((e) => e.eventType === eventType);
  }

  reset(): void {
    this.events = [];
  }
}

export const globalPlatformEventBus = new PlatformEventBus();
