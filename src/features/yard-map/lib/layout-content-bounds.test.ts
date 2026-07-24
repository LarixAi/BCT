import { describe, expect, it } from "vitest";
import { BCT_MAIN_DEPOT_LAYOUT } from "@veyvio/yard";
import { layoutContentBounds } from "@/features/yard-map/lib/layout-content-bounds";

describe("layoutContentBounds", () => {
  it("includes all 26 bays within the bounds", () => {
    const bounds = layoutContentBounds(BCT_MAIN_DEPOT_LAYOUT);
    for (const bay of BCT_MAIN_DEPOT_LAYOUT.bays) {
      const { x, y, width, height } = bay.geometry;
      expect(x).toBeGreaterThanOrEqual(bounds.x);
      expect(y).toBeGreaterThanOrEqual(bounds.y);
      expect(x + width).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(y + height).toBeLessThanOrEqual(bounds.y + bounds.height);
    }
  });

  it("expands when a bay is moved outside the default canvas", () => {
    const bay1 = BCT_MAIN_DEPOT_LAYOUT.bays.find(b => b.bayNumber === 1)!;
    const layout = {
      ...BCT_MAIN_DEPOT_LAYOUT,
      bays: BCT_MAIN_DEPOT_LAYOUT.bays.map(b =>
        b.id === bay1.id
          ? { ...b, geometry: { ...b.geometry, x: 980, y: 740 } }
          : b,
      ),
    };
    const bounds = layoutContentBounds(layout);
    expect(bounds.y + bounds.height).toBeGreaterThan(760);
  });
});
