export type AdBlueFillType = "full" | "partial" | "emergency";

export type AdBlueRefillSource =
  | "depot-dispenser"
  | "retail-station"
  | "container"
  | "mobile-service";

export type AdBlueWarningState =
  | "none"
  | "low"
  | "no-restart"
  | "system-fault";

export type AdBlueWarningCleared = "yes" | "no" | "not_checked" | "requires_drive";

export type AdBluePhysicallyAddedBy = "self" | "other_staff" | "external";

export interface AdBlueRefillInput {
  occurredAt: string;
  odometerMiles: number;
  quantityLitres: number;
  fillType: AdBlueFillType;
  source: AdBlueRefillSource;
  sourceLabel?: string;
  warningState: AdBlueWarningState;
  warningCleared: AdBlueWarningCleared;
  spillOrContamination: boolean;
  physicallyAddedBy: AdBluePhysicallyAddedBy;
  physicallyAddedByName?: string;
  note?: string;
}

export interface AdBlueRefillRecord extends AdBlueRefillInput {
  id: string;
  vehicleId: string;
  bayId: string;
  recordedAt: string;
  recordedBy: string;
  recordedByRole: string;
  createDefectSuggested: boolean;
}
