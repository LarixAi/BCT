import { describe, expect, it } from "vitest";
import * as fx from "@/data/fixtures";
import { buildHandoverSummary } from "@/domain/yard/handover-summary";

describe("handover-summary", () => {
  it("summarises fleet and trip state", () => {
    const summary = buildHandoverSummary(fx.vehicles, fx.trips, fx.defects, fx.vorCases);
    expect(summary.vehicleCount).toBe(fx.vehicles.length);
    expect(summary.openDefects).toBeGreaterThan(0);
    expect(summary.activeVorCases).toBeGreaterThan(0);
    expect(summary.tripsBlocked).toBeGreaterThan(0);
  });
});
