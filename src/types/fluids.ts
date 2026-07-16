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

export interface AdBlueRefillInput {
  occurredAt: string;
  odometerMiles: number;
  quantityLitres: number;
  fillType: AdBlueFillType;
  source: AdBlueRefillSource;
  sourceLabel?: string;
  warningState: AdBlueWarningState;
  spillOrContamination: boolean;
  note?: string;
}

export interface AdBlueRefillRecord extends AdBlueRefillInput {
  id: string;
  vehicleId: string;
  bayId: string;
  recordedAt: string;
  recordedBy: string;
}
