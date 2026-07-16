import { describe, expect, it } from "vitest";
import { createAdBlueRefillRecord } from "@/domain/fluids/adblue-refill";
import { vehicles } from "@/data/fixtures";

const validInput = {
  occurredAt: "2026-07-16T09:32:00.000Z",
  odometerMiles: 82416,
  quantityLitres: 18.4,
  fillType: "full" as const,
  source: "depot-dispenser" as const,
  sourceLabel: "Pump D-02",
  warningState: "none" as const,
  spillOrContamination: false,
};

describe("createAdBlueRefillRecord", () => {
  it("creates an auditable vehicle refill record", () => {
    const record = createAdBlueRefillRecord(vehicles[0], validInput, {
      id: "abr_1",
      recordedAt: "2026-07-16T09:33:00.000Z",
      recordedBy: "J. Miller",
    });

    expect(record).toMatchObject({
      id: "abr_1",
      vehicleId: vehicles[0].id,
      bayId: vehicles[0].bayId,
      quantityLitres: 18.4,
      odometerMiles: 82416,
      recordedBy: "J. Miller",
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
});
