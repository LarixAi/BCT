import { describe, expect, it, beforeEach } from "vitest";
import { resetMockDutyStoreForTests, getMockDutyDetail } from "@/data/mocks/duties";
import { buildDutyPrepSteps } from "@/domain/duty/duty-prep-steps";
import { buildDutiesWorkspaceView } from "@/domain/trips/duties-workspace-view";
import { patchDutyLocal } from "@/features/duty/patch-duty-local";
import { useDriverStore } from "@/store/driver";

describe("duties workspace prep walkthrough", () => {
  beforeEach(() => {
    resetMockDutyStoreForTests();
    useDriverStore.setState({ dutyDetails: {} });
  });

  it("advances acknowledge → vehicle → check → clock_in → ready", () => {
    const dutyId = "duty_1";

    let duty = getMockDutyDetail(dutyId)!;
    expect(buildDutiesWorkspaceView(duty).stage).toBe("acknowledge");

    patchDutyLocal(dutyId, { lifecycleStatus: "ready" });
    duty = useDriverStore.getState().dutyDetails[dutyId]!;
    expect(buildDutiesWorkspaceView(duty).stage).toBe("vehicle");
    expect(buildDutyPrepSteps(duty).find((s) => s.current)?.id).toBe("vehicle");

    patchDutyLocal(dutyId, { vehicleVerified: true });
    duty = useDriverStore.getState().dutyDetails[dutyId]!;
    expect(buildDutiesWorkspaceView(duty).stage).toBe("check");

    patchDutyLocal(dutyId, (d) => ({
      ...d,
      vehicleCheck: {
        ...d.vehicleCheck,
        status: "cleared",
        canStartDuty: true,
      },
    }));
    duty = useDriverStore.getState().dutyDetails[dutyId]!;
    expect(buildDutiesWorkspaceView(duty).stage).toBe("clock_in");

    patchDutyLocal(dutyId, { clockedInAt: new Date().toISOString() });
    duty = useDriverStore.getState().dutyDetails[dutyId]!;
    expect(buildDutiesWorkspaceView(duty).stage).toBe("ready");
    expect(buildDutiesWorkspaceView(duty).primaryLabel).toBe("OPEN JOURNEY");
  });
});
