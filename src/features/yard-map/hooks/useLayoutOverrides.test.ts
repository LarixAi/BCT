import { describe, expect, it } from "vitest";
import { BCT_MAIN_DEPOT_LAYOUT } from "@veyvio/yard";
import {
  applyLayoutDraft,
  createGateFromRect,
  createZoneFromRect,
  exportLayoutDraft,
  rotateBayOverride,
} from "@/features/yard-map/lib/layout-editor-draft";

describe("applyLayoutDraft", () => {
  it("moves and rotates a bay when overrides are present", () => {
    const bay1 = BCT_MAIN_DEPOT_LAYOUT.bays.find(b => b.bayNumber === 1)!;
    const rotated = rotateBayOverride(bay1);
    const result = applyLayoutDraft(BCT_MAIN_DEPOT_LAYOUT, {
      bayOverrides: { [bay1.id]: { ...rotated, x: 900, y: 460 } },
      addedZones: [],
      addedGates: [],
    });
    const moved = result.bays.find(b => b.bayNumber === 1)!;
    expect(moved.geometry.x).toBe(900);
    expect(moved.parkingDirection).toBe("east");
    expect(moved.geometry.width).toBe(bay1.geometry.height);
  });
});

describe("createZoneFromRect", () => {
  it("creates a yellow hatched safety zone", () => {
    const zone = createZoneFromRect("add-safety", 100, 100, 80, 40);
    expect(zone?.kind).toBe("NO_PARKING");
    expect(zone?.name).toContain("Safety");
  });

  it("creates a building zone", () => {
    const zone = createZoneFromRect("add-building", 10, 10, 120, 60);
    expect(zone?.kind).toBe("OFFICE");
  });
});

describe("createGateFromRect", () => {
  it("creates entrance and exit gates", () => {
    expect(createGateFromRect("add-entrance", 0, 0, 100, 20)?.kind).toBe("ENTRANCE");
    expect(createGateFromRect("add-exit", 0, 0, 100, 20)?.kind).toBe("EXIT");
  });
});

describe("exportLayoutDraft", () => {
  it("exports bay helper lines for the layout file", () => {
    const text = exportLayoutDraft(BCT_MAIN_DEPOT_LAYOUT, {
      bayOverrides: {},
      addedZones: [],
      addedGates: [],
    });
    expect(text).toContain("bay(1,");
    expect(text).toContain("bayH(17,");
  });
});
