import { describe, expect, it } from "vitest";
import { formatSyncError, isBodyConditionDeployError } from "@/domain/sync/format-sync-error";

describe("formatSyncError body condition", () => {
  it("explains undeployed inspection.media handler", () => {
    const raw = JSON.stringify({
      code: "mutation_not_supported",
      message: "Yard mutation not supported: inspection.media",
    });
    expect(formatSyncError(raw)).toContain("Body inspection sync is not on the live server");
    expect(isBodyConditionDeployError(raw)).toBe(true);
  });
});
