import { beforeEach, describe, expect, it } from "vitest";
import { resetMockDutyStoreForTests, getMockDutyDetail } from "@/data/mocks/duties";
import { buildMockVehicleChecksHome } from "@/data/mocks/vehicle-check";
import { buildMockHomeSummary } from "@/data/mocks/home-summary";
import { buildDutyPrepSteps } from "@/domain/duty/duty-prep-steps";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";
import {
  applyCheckSubmissionToDriverState,
  reconcileReleasedCheckToDriver,
} from "@/domain/vehicle-check/complete-check-flow";
import { useDriverStore } from "@/store/driver";
import type { VehicleCheckSession } from "@/types/vehicle-check";

function clearedSession(home = buildMockVehicleChecksHome()): VehicleCheckSession {
  return {
    id: "vc_test_1",
    vehicleId: home.vehicle.vehicleId,
    dutyId: home.dutyId,
    vehicleAssignmentId: home.vehicleAssignmentId,
    templateVersion: "1",
    phase: "submitted",
    verified: true,
    dashboardPhotoTaken: true,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    itemResults: {},
    defects: [],
    syncStatus: "synced",
    outcome: "nil_defects",
    checkReference: "VC-TEST",
    odometer: home.vehicle.mileage,
    fuelLevel: home.vehicle.fuelOrChargeLevel,
  };
}

describe("check completion syncs to duties + strip", () => {
  beforeEach(() => {
    resetMockDutyStoreForTests();
    useDriverStore.setState({
      dutyDetails: {},
      homeSummary: buildMockHomeSummary(),
    });
  });

  it("clears strip and advances check prep step when check is submitted", () => {
    const home = buildMockVehicleChecksHome();
    const session = clearedSession(home);

    applyCheckSubmissionToDriverState("nil_defects", home, session, { enqueueCommand: false });

    const summary = useDriverStore.getState().homeSummary;
    expect(shouldShowVehicleCheckRequiredStrip(summary)).toBe(false);
    expect(summary.vehicleAssignment?.checkStatus).toBe("passed");

    const duty = useDriverStore.getState().getDuty("duty_1")!;
    expect(duty.vehicleCheck.canStartDuty).toBe(true);
    expect(duty.vehicleCheck.status).toBe("cleared");
    expect(buildDutyPrepSteps(duty).find((s) => s.id === "check")?.done).toBe(true);
  });

  it("reconciles when Checks is already released but home still requires a check", () => {
    const releasedHome = buildMockVehicleChecksHome({
      vehicle: {
        ...buildMockVehicleChecksHome().vehicle,
        gateStatus: "ready_for_service",
        lastCompletedCheck: {
          id: "vc_done",
          reference: "VC-DONE",
          completedAt: "06:32",
          result: "nil_defects",
          odometer: 48216,
        },
      },
    });

    expect(getMockDutyDetail("duty_1")?.vehicleCheck.canStartDuty).toBe(false);
    expect(shouldShowVehicleCheckRequiredStrip(useDriverStore.getState().homeSummary)).toBe(true);

    const changed = reconcileReleasedCheckToDriver(releasedHome, null);
    expect(changed).toBe(true);
    expect(shouldShowVehicleCheckRequiredStrip(useDriverStore.getState().homeSummary)).toBe(false);
    expect(useDriverStore.getState().getDuty("duty_1")?.vehicleCheck.canStartDuty).toBe(true);
  });
});
