import { describe, expect, it } from "vitest";
import { buildDepotReadinessSeries, fleetReadinessSnapshot } from "./depot-readiness-series";
import type { Vehicle } from "@/types/yard";

const vehicles: Vehicle[] = [
  { id: "v1", reg: "AB12 CDE", type: "Low-floor", bayId: "A01", status: "Available", fuelPct: 80 },
  { id: "v2", reg: "EF34 GHI", type: "Low-floor", bayId: "A02", status: "VOR", fuelPct: 40 },
  { id: "v3", reg: "JK56 LMN", type: "Coach", bayId: "A03", status: "On Departure Line", fuelPct: 90 },
  { id: "v4", reg: "OP78 QRS", type: "Minibus", bayId: "A04", status: "Awaiting Check", fuelPct: 70 },
];

describe("fleetReadinessSnapshot", () => {
  it("counts available and on-line vehicles as ready", () => {
    expect(fleetReadinessSnapshot(vehicles)).toEqual({ ready: 2, blocked: 2, pct: 50 });
  });
});

describe("buildDepotReadinessSeries", () => {
  it("anchors today on the live fleet snapshot", () => {
    const series = buildDepotReadinessSeries(vehicles);
    const today = series.find(d => d.isToday);
    expect(today).toBeDefined();
    expect(today?.readinessPct).toBe(50);
    expect(today?.ready).toBe(2);
    expect(today?.blocked).toBe(2);
    expect(series).toHaveLength(6);
  });
});
