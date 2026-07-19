import type { AdBlueRefillInput, AdBlueRefillRecord } from "@/types/fluids";
import type { Vehicle } from "@/types/yard";

export interface AdBlueRefillMeta {
  id: string;
  recordedAt: string;
  recordedBy: string;
  recordedByRole?: string;
}

export function shouldSuggestAdBlueDefect(input: Pick<AdBlueRefillInput, "warningState" | "warningCleared" | "spillOrContamination">) {
  if (input.spillOrContamination) return true;
  if (input.warningState === "no-restart" || input.warningState === "system-fault") return true;
  if (input.warningCleared === "no") return true;
  return false;
}

export function createAdBlueRefillRecord(
  vehicle: Vehicle,
  input: AdBlueRefillInput,
  meta: AdBlueRefillMeta,
): AdBlueRefillRecord {
  if (!Number.isFinite(input.quantityLitres) || input.quantityLitres <= 0) {
    throw new Error("Enter the quantity of AdBlue added.");
  }
  if (!Number.isFinite(input.odometerMiles) || input.odometerMiles < 0) {
    throw new Error("Enter a valid odometer reading.");
  }
  if (Number.isNaN(Date.parse(input.occurredAt))) {
    throw new Error("Enter a valid refill date and time.");
  }
  if (input.physicallyAddedBy !== "self" && !input.physicallyAddedByName?.trim()) {
    throw new Error("Enter who physically added the AdBlue.");
  }

  return {
    ...input,
    quantityLitres: Math.round(input.quantityLitres * 100) / 100,
    odometerMiles: Math.round(input.odometerMiles),
    note: input.note?.trim() || undefined,
    sourceLabel: input.sourceLabel?.trim() || undefined,
    physicallyAddedByName: input.physicallyAddedByName?.trim() || undefined,
    id: meta.id,
    vehicleId: vehicle.id,
    bayId: vehicle.bayId,
    recordedAt: meta.recordedAt,
    recordedBy: meta.recordedBy,
    recordedByRole: meta.recordedByRole ?? "Yard operative",
    createDefectSuggested: shouldSuggestAdBlueDefect(input),
  };
}
