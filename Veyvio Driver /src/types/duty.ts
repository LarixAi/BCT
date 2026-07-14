// Transport hierarchy: Duty → Journey (Run) → Route → Stop → Passenger task

export type DutyLifecycleStatus =
  | "published"
  | "delivered"
  | "viewed"
  | "acknowledged"
  | "declined"
  | "ready"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RunStatus = "scheduled" | "active" | "paused" | "completed";

export type StopStatus =
  | "scheduled"
  | "approaching"
  | "arrived"
  | "in_progress"
  | "waiting_for_operations"
  | "completed"
  | "skipped";

/** Driver-facing stop workflow type — never default unknown stops to passenger pickup. */
export type StopKind =
  | "depot_departure"
  | "passenger_pickup"
  | "passenger_dropoff"
  | "operational_waypoint"
  | "driver_break"
  | "fuel_stop"
  | "vehicle_change"
  | "depot_return";

export type PassengerTaskStatus =
  | "scheduled"
  | "boarded"
  | "not_ready"
  | "no_show"
  | "cancelled"
  | "refused"
  | "unwell"
  | "dropped_off"
  | "handed_over"
  | "escalated";

export type VehicleCheckItemState = "ok" | "defect" | "unset";

export type VehicleCheckStatus = "not_started" | "in_progress" | "submitted" | "awaiting_decision" | "cleared";

export interface VehicleSummary {
  id: string;
  registrationNumber: string;
  fleetNumber: string;
  make: string;
  model: string;
  seatingCapacity: number;
  wheelchairCapacity: number;
  fuelType: string;
  mileage: number;
  vorStatus: boolean;
  knownDefects: string[];
}

export interface PassengerTask {
  id: string;
  passengerId: string;
  passengerName: string;
  stopId: string;
  type: "pickup" | "dropoff";
  status: PassengerTaskStatus;
  accessibilityNotes?: string;
  safeguardingNotes?: string;
  requiresEscort: boolean;
  plannedTime?: string;
}

export interface DutyStop {
  id: string;
  stopOrder: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  plannedArrival: string;
  plannedDeparture?: string;
  status: StopStatus;
  kind?: StopKind;
  passengerTasks: PassengerTask[];
}

export interface DutyRun {
  id: string;
  /** Canonical journey id for Driver ops (may differ from scheduling run id). */
  journeyId?: string;
  name: string;
  status: RunStatus;
  stops: DutyStop[];
}

export interface DutySummary {
  id: string;
  reference: string;
  dutyDate: string;
  startTime: string;
  endTime: string;
  lifecycleStatus: DutyLifecycleStatus;
  reportingLocation: string;
  routeName: string;
  passengerCount: number;
  escortRequired: boolean;
  specialInstructions?: string;
  vehicle?: VehicleSummary;
}

export interface DutyDetail extends DutySummary {
  runs: DutyRun[];
  vehicleCheck: {
    status: VehicleCheckStatus;
    canStartDuty: boolean;
    pendingManagerAdvice: boolean;
    checklist: Record<string, VehicleCheckItemState>;
    vehicleId?: string;
    assignmentId?: string;
    checkSessionId?: string;
  };
  vehicleVerified: boolean;
  /** Set by duty.clock_in — required before journey.start */
  clockedInAt?: string;
  fitForDutyDeclaredAt?: string;
  /** Canonical journey for the primary / first run on this duty */
  primaryJourneyId?: string;
  /** Currently active journey for this duty (lifecycle — not assumed runs[0]) */
  activeJourneyId?: string;
  clockedOutAt?: string;
  startedAt?: string;
  completedAt?: string;
  /** Set after vehicle.handback command */
  vehicleHandback?: {
    completedAt: string;
    locationOrBay: string;
    custodyAction: string;
  };
  /** Persisted break — startedAt drives elapsed time (not a render clock). */
  activeBreak?: {
    startedAt: string;
    journeyId: string;
    locationLabel?: string;
    minMinutes?: number;
  };
  journeyNotes?: Array<{
    id: string;
    body: string;
    journeyId: string;
    stopId?: string;
    recordedAt: string;
    recordedBy: string;
  }>;
  delayReports?: Array<{
    id: string;
    journeyId: string;
    stopId?: string;
    reason: string;
    estimatedMinutes: number;
    note?: string;
    recordedAt: string;
    assistanceRequired?: boolean;
  }>;
}

/** @deprecated Independent inline checklist removed — open canonical /checks session instead. */
export const DRIVER_VEHICLE_CHECK_ITEMS = [
  { id: "lights", label: "Lights and indicators" },
  { id: "tyres", label: "Tyres and wheels" },
  { id: "mirrors", label: "Mirrors and glass" },
  { id: "doors", label: "Doors and exits" },
  { id: "wheelchair_lift", label: "Wheelchair lift / ramp" },
  { id: "fire_extinguisher", label: "Fire extinguisher" },
  { id: "bodywork", label: "Bodywork and damage" },
] as const;

export type VehicleCheckItemId = (typeof DRIVER_VEHICLE_CHECK_ITEMS)[number]["id"];
