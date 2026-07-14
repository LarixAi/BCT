import { describe, expect, it } from "vitest";
import * as fx from "@/data/fixtures";
import {
  buildBayOccupancy,
  getAttentionItems,
  getEmptyBaysInZone,
  groupBaysByZone,
  zoneOccupancyStats,
} from "@/features/yard/yard-map";

describe("yard-map", () => {
  it("maps vehicles to bays", () => {
    const occupancy = buildBayOccupancy(fx.bays, fx.vehicles);
    const a01 = occupancy.find(o => o.bay.id === "A01");
    expect(a01?.vehicle?.reg).toBe("SK23 FGH");
  });

  it("groups bays by zone in stable order", () => {
    const grouped = groupBaysByZone(fx.bays);
    expect(grouped.get("Parking")?.length).toBe(14);
    expect(grouped.get("Departure Line")?.length).toBe(6);
  });

  it("finds empty parking bays", () => {
    const empty = getEmptyBaysInZone(fx.bays, fx.vehicles, "Parking");
    expect(empty.length).toBeGreaterThan(0);
    expect(empty.every(b => b.zone === "Parking")).toBe(true);
  });

  it("computes zone occupancy stats", () => {
    const stats = zoneOccupancyStats(fx.bays, fx.vehicles);
    const parking = stats.find(s => s.zone === "Parking");
    expect(parking?.total).toBe(14);
    expect(parking!.occupied + parking!.empty).toBe(parking!.total);
  });

  it("builds attention items from fleet state", () => {
    const items = getAttentionItems(fx.vehicles, fx.trips);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some(i => i.id === "blocked" || i.id === "vor")).toBe(true);
  });
});
