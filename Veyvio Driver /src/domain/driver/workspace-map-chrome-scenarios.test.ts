import { describe, expect, it } from "vitest";
import {
  clampMapFabBottomPx,
  maxExpandedSheetHeightPx,
  workspaceTopChromeBottomPx,
} from "./workspace-map-chrome";
import { heightForSize } from "@/features/duty/use-duties-sheet-drag";
import { SHEET_HEIGHT_PX } from "@/domain/trips/duties-workspace-view";

describe("duties sheet vs floating chrome scenarios", () => {
  const shortPhone = 667; // workspace height after BottomNav
  const mediumPhone = 740;

  it("collapsed and medium never clamp FABs into chrome on short phone", () => {
    for (const height of [SHEET_HEIGHT_PX.collapsed, SHEET_HEIGHT_PX.medium]) {
      const bottom = clampMapFabBottomPx(height, shortPhone, {
        stripActive: false,
        safeAreaTopPx: 47,
        fabCount: 2,
      });
      expect(bottom).toBe(height + 18);
    }
  });

  it("expanded is capped so top chrome stays clear", () => {
    const cap = maxExpandedSheetHeightPx(shortPhone, {
      stripActive: false,
      safeAreaTopPx: 47,
      mediumFloorPx: SHEET_HEIGHT_PX.medium,
    });
    const expanded = heightForSize("expanded", cap);
    const chromeBottom = workspaceTopChromeBottomPx({
      stripActive: false,
      safeAreaTopPx: 47,
    });
    expect(expanded).toBeLessThanOrEqual(shortPhone - chromeBottom - 12);
    expect(expanded).toBe(cap);
  });

  it("expanded FABs stay below Safety / Home band", () => {
    const cap = maxExpandedSheetHeightPx(mediumPhone, {
      stripActive: true,
      safeAreaTopPx: 47,
      mediumFloorPx: SHEET_HEIGHT_PX.medium,
    });
    const live = heightForSize("expanded", cap);
    const bottom = clampMapFabBottomPx(live, mediumPhone, {
      stripActive: true,
      safeAreaTopPx: 47,
      fabCount: 2,
    });
    const chromeBottom = workspaceTopChromeBottomPx({
      stripActive: true,
      safeAreaTopPx: 47,
    });
    // FAB top = workspace - bottom - stack(112)
    const fabTop = mediumPhone - bottom - 112;
    expect(fabTop).toBeGreaterThanOrEqual(chromeBottom + 12);
  });

  it("strip-active chrome sits lower than safe-area chrome", () => {
    const withStrip = workspaceTopChromeBottomPx({
      stripActive: true,
      safeAreaTopPx: 47,
    });
    const without = workspaceTopChromeBottomPx({
      stripActive: false,
      safeAreaTopPx: 47,
    });
    expect(withStrip).toBeLessThan(without);
  });
});
