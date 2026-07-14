/** Transport hierarchy — see product spec §2 */

export type AssignmentType =
  | "single_trip"
  | "school_run"
  | "multi_stop_run"
  | "shuttle"
  | "vehicle_movement"
  | "rescue_replacement";

export type AssignmentStatus =
  | "assigned"
  | "acknowledged"
  | "check_required"
  | "ready"
  | "confirmed"
  | "in_progress"
  | "running_late"
  | "updated"
  | "cancelled"
  | "completed"
  | "debrief_required";

export type TripsTab = "today" | "upcoming" | "completed";

export type OperationalAlertType =
  | "vehicle_check_incomplete"
  | "vehicle_changed"
  | "trip_updated"
  | "accessibility_changed"
  | "previous_trip_late"
  | "acknowledgement_required"
  | "offline_unsynced";

export interface OperationalAlert {
  id: string;
  type: OperationalAlertType;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  priority: "safety" | "blocking" | "information";
}

export interface AssignmentMetadata {
  passengerCount?: number;
  wheelchairRequired?: boolean;
  childPassenger?: boolean;
  escortRequired?: boolean;
  luggage?: boolean;
  serviceAnimal?: boolean;
  stopCount?: number;
  pickupCount?: number;
  dropoffCount?: number;
  passengersCollected?: number;
  estimatedDuration?: string;
  hasInstructions?: boolean;
}

export interface DriverAssignment {
  id: string;
  dutyId?: string;
  reference: string;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd?: string;
  origin: string;
  destination: string;
  runName?: string;
  currentStop?: string;
  nextStop?: string;
  vehicleRegistration?: string;
  vehicleId?: string;
  delayLabel?: string;
  checkInFrom?: string;
  hasOfficeChange?: boolean;
  officeChangeSummary?: string;
  acknowledgementRequired?: boolean;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  metadata: AssignmentMetadata;
  primaryActionLabel: string;
  primaryActionHref?: string;
  /** Compact display for completed items */
  actualStart?: string;
  actualEnd?: string;
  hadIncident?: boolean;
  debriefRequired?: boolean;
  debriefCompleted?: boolean;
}

export interface TripStop {
  id: string;
  order: number;
  name: string;
  address: string;
  plannedTime?: string;
  actualTime?: string;
  status: "pending" | "arrived" | "completed" | "skipped";
  type: "pickup" | "dropoff" | "depot" | "waypoint";
}

export interface TripPassenger {
  id: string;
  name: string;
  passengerProfileId?: string;
  mobilityNotes?: string;
  wheelchairRequired?: boolean;
  escortName?: string;
  boardingInstructions?: string;
  handoverRequirements?: string;
  safeguardingWarning?: boolean;
  status: "scheduled" | "boarded" | "no_show" | "dropped_off";
}

export interface TripInstruction {
  id: string;
  category: "pickup" | "access" | "assistance" | "destination" | "handover" | "operations";
  title: string;
  body: string;
}

export interface TripDetail extends DriverAssignment {
  dispatcherDepot?: string;
  stopTimeline: TripStop[];
  passengers: TripPassenger[];
  instructions: TripInstruction[];
}

export interface TripsSchedulePayload {
  operationalAlerts: OperationalAlert[];
  today: DriverAssignment[];
  upcoming: Record<string, DriverAssignment[]>;
  completed: Record<string, DriverAssignment[]>;
}

export interface TripsPageState {
  activeTab: TripsTab;
  completedFilter: "7d" | "30d" | "school_runs" | "passenger" | "movements" | "incidents";
}
