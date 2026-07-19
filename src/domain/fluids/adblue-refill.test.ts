import { describe, expect, it } from "vitest";
import { createAdBlueRefillRecord, shouldSuggestAdBlueDefect } from "@/domain/fluids/adblue-refill";
import { vehicles } from "@/data/fixtures";

const validInput = {
  occurredAt: "2026-07-16T09:32:00.000Z",
  odometerMiles: 82416,
  quantityLitres: 18.4,
  fillType: "full" as const,
  source: "depot-dispenser" as const,
  sourceLabel: "Pump D-02",
  warningState: "none" as const,
  warningCleared: "yes" as const,
  spillOrContamination: false,
  physicallyAddedBy: "self" as const,
};

describe("createAdBlueRefillRecord", () => {
  it("creates an auditable vehicle refill record", () => {
    const record = createAdBlueRefillRecord(vehicles[0], validInput, {
      id: "abr_1",
      recordedAt: "2026-07-16T09:33:00.000Z",
      recordedBy: "J. Miller",
      recordedByRole: "Yard manager",
    });

    expect(record).toMatchObject({
      id: "abr_1",
      vehicleId: vehicles[0].id,
      bayId: vehicles[0].bayId,
      quantityLitres: 18.4,
      odometerMiles: 82416,
      recordedBy: "J. Miller",
      recordedByRole: "Yard manager",
      warningCleared: "yes",
      physicallyAddedBy: "self",
      createDefectSuggested: false,
    });
  });

  it("rejects a refill with no quantity", () => {
    expect(() =>
      createAdBlueRefillRecord(vehicles[0], { ...validInput, quantityLitres: 0 }, {
        id: "abr_2",
        recordedAt: validInput.occurredAt,
        recordedBy: "J. Miller",
      }),
    ).toThrow("Enter the quantity of AdBlue added.");
  });

  it("requires a name when recording for someone else", () => {
    expect(() =>
      createAdBlueRefillRecord(
        vehicles[0],
        { ...validInput, physicallyAddedBy: "other_staff" },
        { id: "abr_3", recordedAt: validInput.occurredAt, recordedBy: "J. Miller" },
      ),
    ).toThrow("Enter who physically added the AdBlue.");
  });
});

describe("shouldSuggestAdBlueDefect", () => {
  it("flags uncleared warnings", () => {
    expect(
      shouldSuggestAdBlueDefect({
        warningState: "low",
        warningCleared: "no",
        spillOrContamination: false,
      }),
    ).toBe(true);
  });
});
