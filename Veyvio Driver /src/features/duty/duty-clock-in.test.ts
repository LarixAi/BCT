import { describe, expect, it, beforeEach } from "vitest";
import {
  resetMockDutyStoreForTests,
  getMockDutyDetail,
  mutateMockDuty,
} from "@/data/mocks/duties";
import { buildDutiesWorkspaceView } from "@/domain/trips/duties-workspace-view";
import { enqueueDriverMutation } from "@/platform/driver/enqueue-driver-mutation";
import { patchDutyLocal } from "@/features/duty/patch-duty-local";
import { ensureDutyCheckReleased } from "@/features/duty/use-duty-prep-actions";
import { useDriverStore } from "@/store/driver";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { buildReadyChecksHome } from "@/data/mocks/vehicle-check";
import type { OutboxMutation } from "@/types/sync";

function mutation(type: OutboxMutation["type"], payload: Record<string, unknown>): OutboxMutation {
  return {
    localOperationId: `local_${Math.random()}`,
    type,
    companyId: "local",
    depotId: "local",
    userId: "drv_1",
    createdAt: new Date().toISOString(),
    payload,
    status: "synced",
  };
}

describe("duty clock-in flow", () => {
  beforeEach(() => {
    resetMockDutyStoreForTests();
    useDriverStore.setState({ dutyDetails: {}, homeSummary: useDriverStore.getState().homeSummary });
    useVehicleCheckStore.setState({ checksHome: buildReadyChecksHome(), activeSession: null });
  });

  it("clock-in via enqueue stamps clockedInAt and advances sheet to ready", async () => {
    const dutyId = "duty_1";
    mutateMockDuty(mutation("duty.acknowledge", { dutyId }));
    mutateMockDuty(mutation("vehicle.verify", { dutyId, vehicleId: "veh_lk23" }));
    mutateMockDuty(
      mutation("vehicle.check.submit", {
        dutyId,
        vehicleId: "veh_lk23",
        assignmentId: "asgn_school_am",
        hasDefect: false,
        outcome: "RELEASED_NO_DEFECTS",
      }),
    );
    useDriverStore.getState().projectDuty(getMockDutyDetail(dutyId)!);

    expect(buildDutiesWorkspaceView(useDriverStore.getState().getDuty(dutyId)!).stage).toBe(
      "clock_in",
    );

    await enqueueDriverMutation(
      "duty.clock_in",
      { dutyId, fitForDutyDeclared: true },
      `duty.${dutyId}.clock_in`,
    );

    const duty = useDriverStore.getState().getDuty(dutyId)!;
    expect(duty.clockedInAt).toBeTruthy();
    expect(buildDutiesWorkspaceView(duty).stage).toBe("ready");
    expect(buildDutiesWorkspaceView(duty).primaryLabel).toBe("OPEN JOURNEY");
  });

  it("ensureDutyCheckReleased heals lagging duty from Checks home", () => {
    const dutyId = "duty_1";
    patchDutyLocal(dutyId, {
      lifecycleStatus: "ready",
      vehicleVerified: true,
    });
    expect(useDriverStore.getState().getDuty(dutyId)?.vehicleCheck.canStartDuty).toBe(false);

    const healed = ensureDutyCheckReleased(dutyId);
    expect(healed?.vehicleCheck.canStartDuty).toBe(true);
    expect(healed?.vehicleCheck.status).toBe("cleared");
  });
});
