import type { AdBlueRefillRecord } from "@/types/fluids";

export const initialAdBlueRefills: AdBlueRefillRecord[] = [
  {
    id: "abr_seed_1",
    vehicleId: "v3",
    bayId: "D01",
    occurredAt: "2026-07-14T15:10:00.000Z",
    recordedAt: "2026-07-14T15:11:00.000Z",
    recordedBy: "J. Miller",
    recordedByRole: "Yard operative",
    odometerMiles: 81762,
    quantityLitres: 16.8,
    fillType: "full",
    source: "depot-dispenser",
    sourceLabel: "Pump D-02",
    warningState: "none",
    warningCleared: "yes",
    spillOrContamination: false,
    physicallyAddedBy: "self",
    createDefectSuggested: false,
  },
];
