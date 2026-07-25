import { describe, expect, it } from "vitest";
import {
  shouldSuggestAdBlueDefect,
  validateAdBlueRefillForm,
  vehicleUsesAdBlue,
} from "@/lib/adblue-refill";

describe("adblue-refill", () => {
  it("validates litres and mileage", () => {
    expect(validateAdBlueRefillForm({ mileage: 100, amountLitres: 12 }).ok).toBe(true);
    expect(validateAdBlueRefillForm({ mileage: -1, amountLitres: 12 }).ok).toBe(false);
    expect(validateAdBlueRefillForm({ mileage: 100, amountLitres: 0 }).ok).toBe(false);
  });

  it("suggests defect when warning did not clear", () => {
    expect(
      shouldSuggestAdBlueDefect({
        warningBefore: "low",
        warningCleared: "no",
        spillOrContamination: false,
      }),
    ).toBe(true);
  });

  it("gates AdBlue UI to diesel-compatible fuel types", () => {
    expect(vehicleUsesAdBlue({ fuelType: "diesel" })).toBe(true);
    expect(vehicleUsesAdBlue({ fuelType: "electric" })).toBe(false);
  });
});
