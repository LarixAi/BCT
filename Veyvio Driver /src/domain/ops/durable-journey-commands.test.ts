import { beforeEach, describe, expect, it } from "vitest";
import { getMockDutyDetail, mutateMockDuty, resetMockDutyStoreForTests } from "@/data/mocks/duties";

describe("durable journey commands", () => {
  beforeEach(() => {
    resetMockDutyStoreForTests();
  });

  it("persists break start and end on the duty", () => {
    const dutyId = "duty_1";
    mutateMockDuty({
      localOperationId: "1",
      type: "journey.break.start",
      companyId: "c1",
      depotId: "d1",
      userId: "u1",
      deviceId: "dev",
      createdAt: new Date().toISOString(),
      payload: { dutyId, journeyId: "journey_school_am", startedAt: "2026-07-14T10:00:00.000Z", minMinutes: 30 },
      status: "syncing",
    });
    let duty = getMockDutyDetail(dutyId)!;
    expect(duty.activeBreak?.startedAt).toBe("2026-07-14T10:00:00.000Z");

    mutateMockDuty({
      localOperationId: "2",
      type: "journey.break.end",
      companyId: "c1",
      depotId: "d1",
      userId: "u1",
      deviceId: "dev",
      createdAt: new Date().toISOString(),
      payload: { dutyId, journeyId: "journey_school_am" },
      status: "syncing",
    });
    duty = getMockDutyDetail(dutyId)!;
    expect(duty.activeBreak).toBeUndefined();
  });

  it("persists journey notes and delay reports", () => {
    const dutyId = "duty_1";
    mutateMockDuty({
      localOperationId: "3",
      type: "journey.note.add",
      companyId: "c1",
      depotId: "d1",
      userId: "u1",
      deviceId: "dev",
      createdAt: new Date().toISOString(),
      payload: {
        dutyId,
        journeyId: "journey_school_am",
        noteId: "note_1",
        body: "Side gate collection",
        recordedAt: "2026-07-14T10:05:00.000Z",
        recordedBy: "driver",
      },
      status: "syncing",
    });
    mutateMockDuty({
      localOperationId: "4",
      type: "delay.report",
      companyId: "c1",
      depotId: "d1",
      userId: "u1",
      deviceId: "dev",
      createdAt: new Date().toISOString(),
      payload: {
        dutyId,
        journeyId: "journey_school_am",
        delayId: "delay_1",
        reason: "traffic",
        estimatedMinutes: 8,
        recordedAt: "2026-07-14T10:06:00.000Z",
      },
      status: "syncing",
    });
    const duty = getMockDutyDetail(dutyId)!;
    expect(duty.journeyNotes?.some((n) => n.body === "Side gate collection")).toBe(true);
    expect(duty.delayReports?.[0]?.estimatedMinutes).toBe(8);
  });
});
