import { describe, expect, it } from "vitest";
import {
  defaultInspectionTypeForContext,
  getInspectionTypeOptions,
  isInspectionTypeAllowed,
  VEHICLE_CONDITION_INSPECTION_TYPES,
} from "./inspection-type-options";

describe("inspection-type-options", () => {
  it("vehicle condition context excludes driver and generic operational types", () => {
    const values = getInspectionTypeOptions("vehicle-condition").map(o => o.value);
    expect(values).toContain("onboarding-baseline");
    expect(values).toContain("weekly-bodywork");
    expect(values).toContain("reported-damage");
    expect(values).not.toContain("driver-pre-use");
    expect(values).not.toContain("start-of-day");
  });

  it("repair verification context only offers post-repair", () => {
    const values = getInspectionTypeOptions("repair-verification").map(o => o.value);
    expect(values).toEqual(["post-repair"]);
  });

  it("defaults to baseline when not approved", () => {
    const type = defaultInspectionTypeForContext("vehicle-condition", {
      vehicleId: "v1",
      baselineStatus: "not_started",
      conditionRating: "unknown",
    });
    expect(type).toBe("onboarding-baseline");
  });

  it("VALID route list matches vehicle condition types", () => {
    expect(VEHICLE_CONDITION_INSPECTION_TYPES.length).toBeGreaterThan(10);
    expect(isInspectionTypeAllowed("driver-pre-use", "vehicle-condition")).toBe(false);
  });
});
