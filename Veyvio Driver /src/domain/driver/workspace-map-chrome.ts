/**
 * Shared map-workspace chrome math: top Home/pill/Safety row, sheet cap, FAB clamp.
 * Used by Duties / Checks / Messages hubs.
 */

/** Diameter of Home / Safety circle buttons */
export const WORKSPACE_CHROME_BUTTON_PX = 54;
/** Padding above chrome row when vehicle-check strip already consumed the notch */
export const WORKSPACE_CHROME_TOP_PAD_PX = 12;
/** Gap below chrome before sheet / FABs may enter */
export const WORKSPACE_CHROME_CLEARANCE_PX = 12;
/** Gap between sheet top and map FABs */
export const WORKSPACE_FAB_SHEET_GAP_PX = 18;
/** Single FAB size */
export const WORKSPACE_FAB_SIZE_PX = 50;
/** Gap between stacked FABs */
export const WORKSPACE_FAB_STACK_GAP_PX = 12;

export function workspaceFabStackHeightPx(fabCount = 2): number {
  if (fabCount <= 0) return 0;
  return fabCount * WORKSPACE_FAB_SIZE_PX + (fabCount - 1) * WORKSPACE_FAB_STACK_GAP_PX;
}

/** Distance from workspace top to bottom edge of the floating chrome row */
export function workspaceTopChromeBottomPx(opts: {
  stripActive: boolean;
  safeAreaTopPx: number;
}): number {
  const top = opts.stripActive
    ? WORKSPACE_CHROME_TOP_PAD_PX
    : Math.max(WORKSPACE_CHROME_TOP_PAD_PX, opts.safeAreaTopPx);
  return top + WORKSPACE_CHROME_BUTTON_PX;
}

/** CSS top for the Home / pill / Safety row */
export function workspaceTopChromeOffsetCss(stripActive: boolean): string {
  return stripActive
    ? `${WORKSPACE_CHROME_TOP_PAD_PX}px`
    : `max(${WORKSPACE_CHROME_TOP_PAD_PX}px, env(safe-area-inset-top))`;
}

/**
 * Max sheet height so expanded never covers the tappable top chrome.
 * Floor at medium so the sheet still has useful content on tiny viewports.
 */
export function maxExpandedSheetHeightPx(
  workspaceHeightPx: number,
  opts: { stripActive: boolean; safeAreaTopPx: number; mediumFloorPx: number },
): number {
  const chromeBottom = workspaceTopChromeBottomPx(opts);
  const capped = Math.floor(
    workspaceHeightPx - chromeBottom - WORKSPACE_CHROME_CLEARANCE_PX,
  );
  return Math.max(opts.mediumFloorPx, capped);
}

/**
 * `bottom` CSS for map FABs: track sheet, but never enter the top chrome band.
 */
export function clampMapFabBottomPx(
  liveSheetHeightPx: number,
  workspaceHeightPx: number,
  opts: {
    stripActive: boolean;
    safeAreaTopPx: number;
    fabCount?: number;
  },
): number {
  const desired = liveSheetHeightPx + WORKSPACE_FAB_SHEET_GAP_PX;
  if (workspaceHeightPx <= 0) return desired;

  const chromeBottom = workspaceTopChromeBottomPx(opts);
  const stack = workspaceFabStackHeightPx(opts.fabCount ?? 2);
  const maxBottom = Math.floor(
    workspaceHeightPx - chromeBottom - WORKSPACE_CHROME_CLEARANCE_PX - stack,
  );
  if (maxBottom < WORKSPACE_FAB_SHEET_GAP_PX) return WORKSPACE_FAB_SHEET_GAP_PX;
  return Math.min(desired, maxBottom);
}
