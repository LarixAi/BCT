import { describe, expect, it } from "vitest";
import { sortOutboxForUpload } from "@/domain/sync/outbox-order";
import type { OutboxMutation } from "@/types/sync";

function row(type: OutboxMutation["type"], createdAt: string, id = type): OutboxMutation {
  return {
    localOperationId: id,
    type,
    companyId: "co",
    depotId: "dep",
    userId: "u",
    deviceId: "d",
    createdAt,
    payload: {},
    status: "pending",
  };
}

describe("sortOutboxForUpload", () => {
  it("uploads inspection.start before inspection.media", () => {
    const sorted = sortOutboxForUpload([
      row("inspection.media", "2026-07-24T10:01:00Z", "m1"),
      row("inspection.start", "2026-07-24T10:00:00Z", "s1"),
    ]);
    expect(sorted.map(m => m.localOperationId)).toEqual(["s1", "m1"]);
  });

  it("keeps chronological order within the same priority band", () => {
    const sorted = sortOutboxForUpload([
      row("inspection.media", "2026-07-24T10:02:00Z", "m2"),
      row("inspection.media", "2026-07-24T10:01:00Z", "m1"),
    ]);
    expect(sorted.map(m => m.localOperationId)).toEqual(["m1", "m2"]);
  });
});
