import { describe, expect, it } from "vitest";
import { assessSignOut } from "@/domain/auth/sign-out-policy";

describe("assessSignOut", () => {
  it("blocks sign out during an active journey", () => {
    const result = assessSignOut({
      activeDutyId: "duty_1",
      dutyLifecycleStatus: "in_progress",
      operationalState: "journey_active",
      vehicleCheckPhase: null,
      pendingSyncCount: 0,
      failedSyncCount: 0,
      hasTripRecovery: false,
    });

    expect(result.severity).toBe("blocked");
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.primaryAction?.href).toBe("/trips?dutyId=duty_1");
  });

  it("blocks sign out during vehicle check", () => {
    const result = assessSignOut({
      activeDutyId: null,
      dutyLifecycleStatus: null,
      operationalState: "vehicle_check_required",
      vehicleCheckPhase: "walkaround",
      pendingSyncCount: 0,
      failedSyncCount: 0,
      hasTripRecovery: false,
    });

    expect(result.severity).toBe("blocked");
    expect(result.primaryAction?.href).toBe("/checks/walkaround");
  });

  it("warns when sync is pending but allows sign out", () => {
    const result = assessSignOut({
      activeDutyId: null,
      dutyLifecycleStatus: null,
      operationalState: "no_duty_scheduled",
      vehicleCheckPhase: null,
      pendingSyncCount: 2,
      failedSyncCount: 0,
      hasTripRecovery: false,
    });

    expect(result.severity).toBe("warning");
    expect(result.blockers).toHaveLength(0);
  });
});
