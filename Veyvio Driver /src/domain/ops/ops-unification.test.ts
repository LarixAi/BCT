import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOfflineCommand,
  drainPlatformEventsForConsumers,
  drainPlatformEventsForYard,
  resetPlatformEventIngest,
  globalCommandApplicator,
  globalPlatformEventBus,
} from "@veyvio/ops";
import {
  getMockDutyDetail,
  mutateMockDuty,
  resetMockDutyStoreForTests,
  syncMockDutyDetail,
} from "@/data/mocks/duties";
import { useDriverStore } from "@/store/driver";
import { MockCommandTransport } from "@/platform/api/command-transport.mock";
import { resetCommandTransportForTests } from "@/platform/api/command-transport";
import type { OutboxMutation } from "@/types/sync";

vi.mock("@/platform/auth/session-store", () => ({
  getSessionSnapshot: () => ({ user: { id: "drv_1" } }),
}));

vi.mock("@/platform/tenancy/context-store", () => ({
  getTenancySnapshot: () => ({ companyId: "co_1", depotId: "dep_1" }),
}));

vi.mock("@/platform/device/device-id", () => ({
  getDeviceId: () => "dev_1",
}));

function mutation(type: OutboxMutation["type"], payload: Record<string, unknown>): OutboxMutation {
  return {
    localOperationId: `local_${Math.random()}`,
    type,
    companyId: "co_1",
    depotId: "dep_1",
    userId: "drv_1",
    deviceId: "dev_1",
    createdAt: new Date().toISOString(),
    payload,
    status: "pending",
    commandId: `cmd_${Math.random().toString(36).slice(2)}`,
    aggregateId: (payload.dutyId as string) ?? "duty_1",
    expectedVersion: 0,
    correlationId: `cor_${Math.random().toString(36).slice(2)}`,
  };
}

describe("Driver operational state unification", () => {
  beforeEach(() => {
    resetMockDutyStoreForTests();
    globalCommandApplicator.reset();
    globalPlatformEventBus.reset();
    resetPlatformEventIngest();
    resetCommandTransportForTests();
    useDriverStore.setState({
      dutyDetails: {},
      activeDutyId: null,
    });
  });

  it("updateDutyDetail keeps mock Map aligned so loadDuty cannot rewind prep", () => {
    const duty = getMockDutyDetail("duty_1")!;
    const patched = {
      ...duty,
      vehicleVerified: true,
      vehicleCheck: { ...duty.vehicleCheck, canStartDuty: true, status: "cleared" as const },
    };
    useDriverStore.getState().updateDutyDetail(patched);

    // Optimistic projection + Map stay aligned for Duties sheet walkthrough
    expect(getMockDutyDetail("duty_1")?.vehicleCheck.canStartDuty).toBe(true);
    expect(useDriverStore.getState().getDuty("duty_1")?.vehicleCheck.canStartDuty).toBe(true);
  });

  it("MockCommandTransport accepts check submit and projects into Zustand", async () => {
    const duty = getMockDutyDetail("duty_1")!;
    useDriverStore.getState().updateDutyDetail({
      ...duty,
      vehicleVerified: true,
      vehicleCheck: {
        ...duty.vehicleCheck,
        canStartDuty: true,
        status: "cleared",
        vehicleId: duty.vehicle?.id,
        assignmentId: "asgn_school_am",
        checkSessionId: "vc_unif_1",
      },
    });

    const transport = new MockCommandTransport();
    const command = createOfflineCommand({
      commandType: "vehicle.check.submit",
      aggregateId: duty.vehicle?.id ?? "veh_lk23",
      expectedVersion: 0,
      tenantId: "co_1",
      depotId: "dep_1",
      actorId: "drv_1",
      deviceId: "dev_1",
      payload: {
        dutyId: "duty_1",
        vehicleId: duty.vehicle?.id,
        assignmentId: "asgn_school_am",
        checkSessionId: "vc_unif_1",
        hasDefect: false,
        outcome: "RELEASED_NO_DEFECTS",
      },
    });

    const result = await transport.send(command);
    expect(result.status).toBe("accepted");
    expect(getMockDutyDetail("duty_1")?.vehicleCheck.canStartDuty).toBe(true);
    expect(useDriverStore.getState().dutyDetails.duty_1?.vehicleCheck.canStartDuty).toBe(true);
  });

  it("clock-in via transport stays consistent after navigation projection read", async () => {
    const duty = getMockDutyDetail("duty_1")!;
    const ready = {
      ...duty,
      lifecycleStatus: "ready" as const,
      vehicleVerified: true,
      vehicleCheck: {
        ...duty.vehicleCheck,
        canStartDuty: true,
        status: "cleared" as const,
        vehicleId: duty.vehicle?.id,
      },
    };
    syncMockDutyDetail(ready);
    useDriverStore.getState().projectDuty(ready);

    const transport = new MockCommandTransport();
    const command = createOfflineCommand({
      commandType: "duty.clock_in",
      aggregateId: "duty_1",
      expectedVersion: 0,
      tenantId: "co_1",
      depotId: "dep_1",
      actorId: "drv_1",
      deviceId: "dev_1",
      payload: { dutyId: "duty_1" },
    });
    const result = await transport.send(command);
    expect(result.status).toBe("accepted");

    const fromStore = useDriverStore.getState().getDuty("duty_1");
    const fromMap = getMockDutyDetail("duty_1");
    expect(fromStore?.clockedInAt).toBeTruthy();
    expect(fromMap?.clockedInAt).toBe(fromStore?.clockedInAt);
  });

  it("getDuty prefers mock clock-in over a stale Zustand snapshot", () => {
    const duty = getMockDutyDetail("duty_1")!;
    const clockedAt = "2026-07-15T06:40:00.000Z";
    syncMockDutyDetail({
      ...duty,
      lifecycleStatus: "ready",
      vehicleVerified: true,
      vehicleCheck: { ...duty.vehicleCheck, canStartDuty: true, status: "cleared" },
      clockedInAt: clockedAt,
      fitForDutyDeclaredAt: clockedAt,
    });
    // Stale store projection without clock-in (simulates a rewind from rejected sync)
    useDriverStore.setState({
      dutyDetails: {
        duty_1: {
          ...duty,
          lifecycleStatus: "ready",
          vehicleVerified: true,
          vehicleCheck: { ...duty.vehicleCheck, canStartDuty: true, status: "cleared" },
        },
      },
    });

    expect(useDriverStore.getState().dutyDetails.duty_1?.clockedInAt).toBeUndefined();
    expect(useDriverStore.getState().getDuty("duty_1")?.clockedInAt).toBe(clockedAt);
  });

  it("stale store does not wipe mock clock-in before journey.start merge", () => {
    const duty = getMockDutyDetail("duty_1")!;
    const clockedAt = "2026-07-15T06:41:00.000Z";
    syncMockDutyDetail({
      ...duty,
      lifecycleStatus: "ready",
      vehicleVerified: true,
      vehicleCheck: {
        ...duty.vehicleCheck,
        canStartDuty: true,
        status: "cleared",
        vehicleId: duty.vehicle?.id,
      },
      clockedInAt: clockedAt,
      fitForDutyDeclaredAt: clockedAt,
    });
    useDriverStore.setState({
      dutyDetails: {
        duty_1: {
          ...duty,
          lifecycleStatus: "ready",
          vehicleVerified: true,
          vehicleCheck: {
            ...duty.vehicleCheck,
            canStartDuty: true,
            status: "cleared",
            vehicleId: duty.vehicle?.id,
          },
        },
      },
    });

    // Merge uses getDuty (fresher) — must not sync the stale store onto the Map
    const live = useDriverStore.getState().getDuty("duty_1");
    expect(live?.clockedInAt).toBe(clockedAt);
    syncMockDutyDetail(live!);
    expect(getMockDutyDetail("duty_1")?.clockedInAt).toBe(clockedAt);

    mutateMockDuty(
      mutation("journey.start", {
        dutyId: "duty_1",
        journeyId: duty.primaryJourneyId ?? duty.runs[0]?.id,
      }),
    );
    expect(getMockDutyDetail("duty_1")?.lifecycleStatus).toBe("in_progress");
  });

  it("handback command projects custody close onto duty", () => {
    mutateMockDuty(
      mutation("vehicle.handback", {
        dutyId: "duty_1",
        vehicleId: "veh_lk23",
        handback: {
          locationOrBay: "Bay 4",
          custodyAction: "returned_to_yard",
          completedAt: "2026-07-14T09:00:00.000Z",
        },
      }),
    );
    expect(getMockDutyDetail("duty_1")?.vehicleHandback?.locationOrBay).toBe("Bay 4");
  });

  it("queues platform events for Admin and Yard separately", async () => {
    const transport = new MockCommandTransport();
    const duty = getMockDutyDetail("duty_1")!;
    syncMockDutyDetail({
      ...duty,
      lifecycleStatus: "ready",
      vehicleVerified: true,
      vehicleCheck: { ...duty.vehicleCheck, canStartDuty: true, status: "cleared" },
    });

    await transport.send(
      createOfflineCommand({
        commandType: "defect.report",
        aggregateId: duty.vehicle?.id ?? "veh_lk23",
        expectedVersion: 0,
        tenantId: "co_1",
        depotId: "dep_1",
        actorId: "drv_1",
        deviceId: "dev_1",
        payload: {
          dutyId: "duty_1",
          vehicleId: duty.vehicle?.id,
          driverAssessment: "restricted",
        },
        correlationId: "cor_defect_1",
      }),
    );

    const admin = drainPlatformEventsForConsumers();
    const yard = drainPlatformEventsForYard();
    expect(admin.some((e) => e.eventType === "defect.reported")).toBe(true);
    expect(yard.some((e) => e.eventType === "defect.reported")).toBe(true);
  });

  it("replaying the same commandId is idempotent", async () => {
    const duty = getMockDutyDetail("duty_1")!;
    syncMockDutyDetail({
      ...duty,
      lifecycleStatus: "ready",
      vehicleVerified: true,
      vehicleCheck: { ...duty.vehicleCheck, canStartDuty: true, status: "cleared" },
    });

    const transport = new MockCommandTransport();
    const command = createOfflineCommand({
      commandType: "duty.clock_in",
      aggregateId: "duty_1",
      expectedVersion: 0,
      tenantId: "co_1",
      depotId: "dep_1",
      actorId: "drv_1",
      deviceId: "dev_1",
      payload: { dutyId: "duty_1" },
    });
    const sealed = { ...command, commandId: "cmd_idempotent_clock" };

    const first = await transport.send(sealed);
    expect(first.status).toBe("accepted");
    const clocked = getMockDutyDetail("duty_1")?.clockedInAt;

    const second = await transport.send({ ...sealed, expectedVersion: 1 });
    expect(second.status).toBe("accepted");
    if (second.status === "accepted") {
      expect(second.events).toEqual([]);
    }
    expect(getMockDutyDetail("duty_1")?.clockedInAt).toBe(clocked);
  });
});
