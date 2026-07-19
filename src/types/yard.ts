// Veyvio Yard domain types (frontend prototype — no backend).

export type VehicleType = "Minibus" | "Low-floor" | "Coach" | "WAV";

export type VehicleStatus =
  | "Available"
  | "Awaiting Check"
  | "On Departure Line"
  | "In Workshop"
  | "VOR"
  | "Off-site";

export type BayZone =
  | "Parking"
  | "Wash"
  | "Fuel"
  | "Inspection"
  | "Workshop"
  | "Departure Line"
  | "Off-site";

export interface Bay {
  id: string;      // "A04"
  zone: BayZone;
}

export interface Vehicle {
  id: string;
  reg: string;         // "SK23 FGH"
  type: VehicleType;
  bayId: string;       // current location
  status: VehicleStatus;
  fuelPct: number;
  lastCheckAt?: string; // ISO
  lastCheckPassed?: boolean;
  notes?: string;
}

export interface Driver {
  id: string;
  name: string;
  compliant: boolean;
}

export type BlockerReason =
  | "No driver"
  | "Fuel low"
  | "Check missing"
  | "VOR"
  | "Vehicle in workshop"
  | "Not on departure line"
  | "Equipment non-compliant"
  | "Equipment restricted";


export interface Trip {
  id: string;
  code: string;      // "R420"
  service: string;   // "St. Jude's"
  departAt: string;  // "06:15"
  vehicleId?: string;
  driverId?: string;
  ready: boolean;
  blockers: BlockerReason[];
  releasedAt?: string;
  releasedBy?: string;
  departedAt?: string;
  departedBy?: string;
  departureSource?: "driver_journey_start" | "yard_confirmed";
}

export type DefectSeverity = "Minor" | "Major" | "Safety-critical";

export interface Defect {
  id: string;
  vehicleId: string;
  category: string; // "Tyres" | "Brakes" | "Lights" | ...
  severity: DefectSeverity;
  notes: string;
  raisedAt: string;
  raisedBy: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  vorCaseId?: string;
  photoUrls?: string[];
  /** Defect found during a yard manager spot audit (missed by driver check). */
  auditFinding?: boolean;
  sourceCheckId?: string;
}

export type VorLifecycle =
  | "Potential"
  | "Awaiting Triage"
  | "Confirmed"
  | "Awaiting Recovery"
  | "Under Repair"
  | "Cleared";

export interface VorCase {
  id: string;
  vehicleId: string;
  defectId?: string;
  lifecycle: VorLifecycle;
  reason: string;
  openedAt: string;
  history: { at: string; by: string; from: VorLifecycle | null; to: VorLifecycle; note?: string }[];
}

export type MovementReason =
  | "Move to departure line"
  | "Move to parking"
  | "Move to inspection"
  | "Move to fuel"
  | "Move to wash"
  | "Move to workshop"
  | "Move off-site"
  | "Departed for service"
  | "Return from off-site";

export interface Movement {
  id: string;
  vehicleId: string;
  fromBayId: string;
  toBayId: string;
  reason: MovementReason;
  at: string;
  by: string;
  note?: string;
}

export type { YardCheckResult, YardCheckType, CheckSafetyOutcome } from "@/types/yard-check";

export interface ShiftHandoverSummary {
  vehicleCount: number;
  available: number;
  vor: number;
  awaitingCheck: number;
  onDepartureLine: number;
  inWorkshop: number;
  offSite: number;
  openDefects: number;
  activeVorCases: number;
  tripsReady: number;
  tripsBlocked: number;
  tripsReleased: number;
  blockedTripCodes: string[];
}

export interface ShiftHandover {
  id: string;
  at: string;
  by: string;
  summary: ShiftHandoverSummary;
  notes: string;
}

export interface DepartureRelease {
  id: string;
  tripId: string;
  vehicleId: string;
  at: string;
  by: string;
  checklist: { id: string; label: string; passed: boolean }[];
  note?: string;
}
