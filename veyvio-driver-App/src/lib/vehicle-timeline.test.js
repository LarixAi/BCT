import { describe, expect, it } from "vitest";
import { formatTimelineWhen, timelineCategoryLabel } from "@/lib/vehicle-timeline";
import { handbackDraftKey } from "@/lib/vehicle-handback-draft.storage";

describe("vehicle timeline", () => {
  it("labels timeline categories for driver UI", () => {
    expect(timelineCategoryLabel("fuel")).toBe("Fuel");
    expect(timelineCategoryLabel("handback")).toBe("Handback");
    expect(timelineCategoryLabel("adblue")).toBe("AdBlue");
  });

  it("formats timeline timestamps for UK locale", () => {
    const formatted = formatTimelineWhen("2026-07-24T12:00:00.000Z");
    expect(formatted).not.toBe("—");
  });
});

describe("vehicle handback draft storage", () => {
  it("scopes handback drafts by company and membership", () => {
    expect(handbackDraftKey("co-a", "mem-1", "veh-9")).toBe(
      "driver:co-a:mem-1:handback-draft:veh-9",
    );
  });
});
