import { describe, expect, it } from "vitest";
import { buildDepotReadinessSeries, fleetReadinessSnapshot } from "./depot-readiness-series";
import type { Vehicle } from "@/types/yard";

const vehicles: Vehicle[] = [
  { id: "v1", reg: "AB12 CDE", type: "Low-floor", bayId: "A01", status: "Available", fuelPct: 80 },
  { id: "v2", reg: "EF34 GHI", type: "Low-floor", bayId: "A02", status: "VOR", fuelPct: 40 },
  { id: "v3", reg: "JK56 LMN", type: "Coach", bayId: "A03", status: "On Departure Line", fuelPct: 90 },
  { id: "v4", reg: "OP78 QRS", type: "Minibus", bayId: "A04", status: "Awaiting Check", fuelPct: 70 },
];

function expectExactlyOneToday(series: ReturnType<typeof buildDepotReadinessSeries>) {
  expect(series).toHaveLength(6);
  expect(series.filter(d => d.isToday)).toHaveLength(1);
  const today = series.find(d => d.isToday);
  expect(today).toBeDefined();
  return today!;
}

describe("fleetReadinessSnapshot", () => {
  it("counts available and on-line vehicles as ready", () => {
    expect(fleetReadinessSnapshot(vehicles)).toEqual({ ready: 2, blocked: 2, pct: 50 });
  });
});

describe("buildDepotReadinessSeries", () => {
  it("anchors Sunday on the live fleet snapshot without relabelling it Saturday", () => {
    const sunday = new Date(2026, 7, 16, 9, 15, 0); // local Sunday 16 Aug 2026
    const series = buildDepotReadinessSeries(vehicles, sunday);
    const today = expectExactlyOneToday(series);
    expect(today.label).toBe("Sun");
    expect(today.readinessPct).toBe(50);
    expect(today.ready).toBe(2);
    expect(today.blocked).toBe(2);
    expect(series.map(d => d.label)).toEqual(["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(series.some(d => d.isToday && d.label === "Sat")).toBe(false);
  });

  it("anchors a weekday on the live fleet snapshot", () => {
    const wednesday = new Date(2026, 7, 12, 18, 0, 0); // local Wednesday 12 Aug 2026
    const series = buildDepotReadinessSeries(vehicles, wednesday);
    const today = expectExactlyOneToday(series);
    expect(today.label).toBe("Wed");
    expect(today.readinessPct).toBe(50);
    expect(today.ready).toBe(2);
    expect(today.blocked).toBe(2);
    expect(series.map(d => d.label)).toEqual(["Fri", "Sat", "Sun", "Mon", "Tue", "Wed"]);
  });
});
