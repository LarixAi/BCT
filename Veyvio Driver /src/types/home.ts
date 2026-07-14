export type ComplianceStatus = "clear" | "warning" | "blocked";

export type DutyStatus =
  | "off_duty"
  | "scheduled"
  | "on_duty"
  | "on_break"
  | "ending_duty"
  | "completed"
  | "no_duty";

export type HomeOperationalState =
  | "no_duty_scheduled"
  | "duty_scheduled_not_started"
  | "vehicle_check_required"
  | "ready_for_work"
  | "journey_assigned"
  | "journey_active"
  | "on_break"
  | "operationally_blocked"
  | "end_of_duty_required";

export type RoadworthinessStatus = "roadworthy" | "restricted" | "vor";

export type VehicleCheckStatus =
  | "not_required"
  | "required"
  | "in_progress"
  | "passed"
  | "failed";

export type TripPhase =
  | "not_started"
  | "en_route_pickup"
  | "at_pickup"
  | "in_transit"
  | "at_destination"
  | "completed";

export type ScheduleItemStatus =
  | "upcoming"
  | "ready"
  | "in_progress"
  | "completed"
  | "delayed"
  | "cancelled"
  | "reassigned"
  | "action_required";

export type RequiredActionPriority =
  | "safety_critical"
  | "work_blocking"
  | "journey_related"
  | "compliance"
  | "information";

export type CardTone = "navy" | "teal" | "amber" | "red" | "green";

export interface DriverTripSummary {
  id: string;
  dutyId: string;
  name: string;
  startTime: string;
  endTime?: string;
  vehicleRegistration: string;
  firstPickupTime?: string;
  passengerCount: number;
  wheelchairPassengerCount: number;
  passengerAssistantName?: string;
  phase: TripPhase;
  estimatedArrival?: string;
  scheduledArrival?: string;
  delayLabel?: string;
  milesRemaining?: number;
  currentPickupIndex?: number;
  totalPickups?: number;
  activePassengerName?: string;
  boardingRequirement?: string;
  escortRequired?: boolean;
  passengersOnboard?: number;
  passengersExpected?: number;
  passengersHandedOver?: number;
}

export interface DriverScheduleItem {
  id: string;
  time: string;
  label: string;
  status: ScheduleItemStatus;
}

export interface DriverRequiredAction {
  id: string;
  priority: RequiredActionPriority;
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
}

export interface OperationalNotice {
  id: string;
  title: string;
  body: string;
  requiresAcknowledgement: boolean;
  acknowledged: boolean;
}

export interface VehicleDefectSummary {
  id: string;
  title: string;
  recordedAt: string;
  blocksUse: boolean;
  /** Formal accepted-defect fields when classification is known */
  location?: string;
  classification?: "cosmetic" | "restricted" | "safety_critical";
  acceptedBy?: string;
  acceptedAt?: string;
  restrictions?: string;
  reviewBy?: string;
}

export interface VehicleAssignmentSummary {
  vehicleId: string;
  registration: string;
  fleetNumber?: string;
  make: string;
  model: string;
  vehicleType: string;
  roadworthinessStatus: RoadworthinessStatus;
  checkStatus: VehicleCheckStatus;
  /** Assignment this readiness applies to — checks are not global */
  assignmentId?: string;
  checkSessionId?: string;
  openDefectCount: number;
  mileage: number;
  fuelOrChargeLevel?: string;
  depotLocation?: string;
  defects: VehicleDefectSummary[];
}

export interface DriverHomeSummary {
  driver: {
    id: string;
    displayName: string;
    companyName: string;
    depotName: string;
    complianceStatus: ComplianceStatus;
    unreadNotifications: number;
  };
  operationalState: HomeOperationalState;
  blockReason?: string;
  duty: {
    status: DutyStatus;
    scheduledStart?: string;
    scheduledStartLabel?: string;
    actualStart?: string;
    drivingMinutes: number;
    dutyMinutes: number;
    nextBreakDueAt?: string;
    dutyId?: string;
  };
  vehicleAssignment?: VehicleAssignmentSummary;
  activeTrip?: DriverTripSummary;
  nextTrip?: DriverTripSummary;
  todaySchedule: DriverScheduleItem[];
  requiredActions: DriverRequiredAction[];
  latestOperationalNotice?: OperationalNotice;
  sync: {
    online: boolean;
    lastSyncedAt?: string;
    pendingChangeCount: number;
  };
}
