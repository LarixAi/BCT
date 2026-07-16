import { describe, expect, it } from "vitest";
import {
  clampMapFabBottomPx,
  maxExpandedSheetHeightPx,
  workspaceTopChromeBottomPx,
  workspaceTopChromeOffsetCss,
} from "./workspace-map-chrome";

describe("workspace map chrome", () => {
  it("uses safe-area top when strip is off", () => {
    expect(workspaceTopChromeOffsetCss(false)).toContain("env(safe-area-inset-top)");
    expect(workspaceTopChromeBottomPx({ stripActive: false, safeAreaTopPx: 47 })).toBe(
      47 + 54,
    );
  });

  it("drops safe-area when strip already owns the notch", () => {
    expect(workspaceTopChromeOffsetCss(true)).toBe("12px");
    expect(workspaceTopChromeBottomPx({ stripActive: true, safeAreaTopPx: 47 })).toBe(12 + 54);
  });

  it("caps expanded sheet below chrome", () => {
    const max = maxExpandedSheetHeightPx(700, {
      stripActive: false,
      safeAreaTopPx: 0,
      mediumFloorPx: 330,
    });
    // 700 - (12+54) - 12 = 622
    expect(max).toBe(622);
  });

  it("clamps FABs so they stay under chrome", () => {
    const bottom = clampMapFabBottomPx(660, 700, {
      stripActive: false,
      safeAreaTopPx: 0,
      fabCount: 2,
    });
    // maxBottom = 700 - 66 - 12 - 112 = 510
    expect(bottom).toBe(510);
    expect(bottom).toBeLessThan(660 + 18);
  });

  it("tracks sheet when there is room", () => {
    expect(
      clampMapFabBottomPx(170, 700, {
        stripActive: false,
        safeAreaTopPx: 0,
        fabCount: 2,
      }),
    ).toBe(188);
  });
});
