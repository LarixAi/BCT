import { describe, expect, it } from "vitest";
import { buildUpcomingFeed } from "./build-upcoming-feed";
import type { Vehicle } from "@/types/yard";

/**
 * F-03 Gate 3 — absence of fake operational truth.
 */
describe("F-03 absence: Upcoming compliance", () => {
  const vehicle: Vehicle = {
    id: "v1",
    reg: "SK23 FGH",
    type: "Coach",
    bayId: "A01",
    status: "Available",
  };

  it("does not invent MOT/retorque when compliance feed is empty", () => {
    const feed = buildUpcomingFeed({
      tasks: [],
      vehicles: [vehicle],
      defects: [],
      movements: [],
      complianceDueItems: [],
    });
    expect(feed.some(item => item.category === "mot")).toBe(false);
    expect(feed.some(item => item.category === "wheel_nut_retorque")).toBe(false);
    expect(feed.some(item => String(item.id).startsWith("compliance-"))).toBe(false);
  });

  it("does not invent first-aid or fixture MOT for empty vehicle set", () => {
    const feed = buildUpcomingFeed({
      tasks: [],
      vehicles: [],
      defects: [],
      movements: [],
    });
    expect(feed).toEqual([]);
  });
});
