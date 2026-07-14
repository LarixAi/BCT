import { describe, expect, it } from "vitest";
import { groupQueueItems, outboxMutationLabel } from "@/domain/sync/sync-queue";
import type { OutboxMutation } from "@/types/sync";

function mutation(partial: Partial<OutboxMutation> & Pick<OutboxMutation, "localOperationId" | "type">): OutboxMutation {
  return {
    companyId: "co_1",
    depotId: "depot_1",
    userId: "drv_1",
    deviceId: "device_1",
    createdAt: "2026-07-12T10:00:00.000Z",
    payload: {},
    status: "pending",
    ...partial,
  };
}

describe("sync queue", () => {
  it("uses operational labels for mutation types", () => {
    expect(outboxMutationLabel("vehicle.check.submit")).toBe("Walkaround check submission");
  });

  it("groups failed and pending queue items", () => {
    const grouped = groupQueueItems([
      mutation({ localOperationId: "a", type: "duty.start", status: "failed" }),
      mutation({ localOperationId: "b", type: "defect.report", status: "pending" }),
      mutation({ localOperationId: "c", type: "duty.complete", status: "synced" }),
    ]);

    expect(grouped.failed).toHaveLength(1);
    expect(grouped.pending).toHaveLength(1);
    expect(grouped.empty).toBe(false);
  });
});
