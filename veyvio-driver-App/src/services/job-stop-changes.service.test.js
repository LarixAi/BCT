import { describe, expect, it } from "vitest";
import { submitDriverStopChange } from "@/services/job-stop-changes.service";

describe("submitDriverStopChange", () => {
  it("hard-blocks all driver itinerary edits", async () => {
    const result = await submitDriverStopChange("job-1", {
      changeType: "add",
      reason: "need fuel",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("driver_itinerary_edit_blocked");
  });
});
