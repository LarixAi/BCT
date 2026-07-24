import { describe, expect, it } from "vitest";
import { BCT_MAIN_DEPOT_LAYOUT } from "@/features/yard-map/layouts/bct-main-depot";
import {
  buildSpatialBayStates,
  isLiveYardMapDepot,
  layoutCapacitySummary,
  resolveYardLayout,
} from "@/features/yard-map/resolve-layout";
import { bctBays, bctVehicles } from "@/data/bct-yard";

describe("resolveYardLayout", () => {
  it("returns BCT layout for BCT-MAIN depot code", () => {
    expect(resolveYardLayout("BCT-MAIN")?.id).toBe("bct-main-depot-v4");
    expect(isLiveYardMapDepot("bct-main")).toBe(true);
  });

  it("returns the default spatial layout for any depot code", () => {
    const layout = resolveYardLayout("WEMBLEY");
    expect(layout?.id).toBe("bct-main-depot-v4");
    expect(layout?.depotCode).toBe("WEMBLEY");
    expect(isLiveYardMapDepot("WEMBLEY")).toBe(true);
  });

  it("returns null when depot code is missing", () => {
    expect(resolveYardLayout(null)).toBeNull();
    expect(isLiveYardMapDepot(null)).toBe(false);
  });
});

describe("BCT_MAIN_DEPOT_LAYOUT", () => {
  it("defines 26 numbered bays", () => {
    expect(BCT_MAIN_DEPOT_LAYOUT.bays).toHaveLength(26);
    expect(BCT_MAIN_DEPOT_LAYOUT.id).toBe("bct-main-depot-v4");
    expect(BCT_MAIN_DEPOT_LAYOUT.bays.map(b => b.bayNumber)).toEqual(
      Array.from({ length: 26 }, (_, i) => i + 1),
    );
  });

  it("marks LIFO bays 10 and 15", () => {
    const lifo = BCT_MAIN_DEPOT_LAYOUT.bays.filter(b => b.isLifo).map(b => b.bayNumber);
    expect(lifo).toEqual([10, 15]);
  });
});

describe("buildSpatialBayStates", () => {
  it("maps vehicles onto layout bays by bay id", () => {
    const states = buildSpatialBayStates(BCT_MAIN_DEPOT_LAYOUT, bctBays, bctVehicles);
    const bay1 = states.find(s => s.bayNumber === 1);
    const bay8 = states.find(s => s.bayNumber === 8);
    expect(bay1?.vehicle?.reg).toBe("WX21 FYV");
    expect(bay8?.vehicle?.reg).toBe("HV20 PLK");
    expect(bay1?.operationalStatus).toBe("occupied");
  });

  it("summarises capacity", () => {
    const states = buildSpatialBayStates(BCT_MAIN_DEPOT_LAYOUT, bctBays, bctVehicles);
    const summary = layoutCapacitySummary(states);
    expect(summary.total).toBe(26);
    expect(summary.occupied).toBe(bctVehicles.length);
    expect(summary.available).toBe(26 - bctVehicles.length);
  });
});
