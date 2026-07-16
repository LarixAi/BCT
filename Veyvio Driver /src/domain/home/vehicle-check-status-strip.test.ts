import { describe, expect, it } from "vitest";
import { buildMockHomeSummary } from "@/data/mocks/home-summary";
import { shouldShowVehicleCheckRequiredStrip } from "./vehicle-check-status-strip";

describe("shouldShowVehicleCheckRequiredStrip", () => {
  it("shows when operational state is vehicle_check_required", () => {
    expect(shouldShowVehicleCheckRequiredStrip(buildMockHomeSummary())).toBe(true);
  });

  it("shows while check is in progress even if state drifted", () => {
    const summary = buildMockHomeSummary({
      operationalState: "duty_scheduled_not_started",
      vehicleAssignment: {
        ...buildMockHomeSummary().vehicleAssignment!,
        checkStatus: "in_progress",
      },
    });
    expect(shouldShowVehicleCheckRequiredStrip(summary)).toBe(true);
  });

  it("hides when vehicle is ready for service", () => {
    const ready = buildMockHomeSummary({
      operationalState: "ready_for_work",
      vehicleAssignment: {
        ...buildMockHomeSummary().vehicleAssignment!,
        checkStatus: "passed",
      },
    });
    expect(shouldShowVehicleCheckRequiredStrip(ready)).toBe(false);
  });

  it("hides when check passed even if operationalState is still vehicle_check_required", () => {
    const drifted = buildMockHomeSummary({
      operationalState: "vehicle_check_required",
      vehicleAssignment: {
        ...buildMockHomeSummary().vehicleAssignment!,
        checkStatus: "passed",
      },
    });
    expect(shouldShowVehicleCheckRequiredStrip(drifted)).toBe(false);
  });
});
