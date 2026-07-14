import { describe, expect, it } from "vitest";
import { conflictMessage, isRetryableConflict } from "@/domain/sync/conflict-policy";

describe("conflict-policy", () => {
  it("describes damage and VOR conflicts in operational language", () => {
    expect(conflictMessage("damage.review")).toContain("Damage review conflict");
    expect(conflictMessage("vehicle.mark_vor")).toContain("VOR status");
  });

  it("flags retryable movement and task conflicts", () => {
    expect(isRetryableConflict("vehicle.move")).toBe(true);
    expect(isRetryableConflict("damage.review")).toBe(false);
  });
});
