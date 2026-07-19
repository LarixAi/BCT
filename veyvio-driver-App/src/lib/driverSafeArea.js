/** Shared safe-area offsets for the driver bottom navigation bar. */

/** Height of nav row: pt-2 + icon + label + pb-2 (excluding safe-area inset). */
export const DRIVER_NAV_CONTENT_PX = 64;

/** Minimum bottom inset when CSS variable is unset (Android gesture bar). */
export const DRIVER_NAV_SAFE_MIN_PX = 24;

/** CSS var for phone bottom safe area — set by useDriverSafeAreaInsets on native. */
export const DRIVER_SAFE_BOTTOM = "var(--driver-safe-bottom, 24px)";

/** CSS var for status bar / notch — set by useDriverSafeAreaInsets. */
export const DRIVER_SAFE_TOP = "var(--driver-safe-top, env(safe-area-inset-top, 0px))";

/** Full-screen page wrapper — pads top and bottom safe areas. */
export const DRIVER_PAGE_SAFE_AREA = {
  paddingTop: DRIVER_SAFE_TOP,
  paddingBottom: DRIVER_SAFE_BOTTOM,
};

/** Top padding for tab screens (status bar + breathing room). */
export const DRIVER_SCREEN_TOP = `calc(${DRIVER_SAFE_TOP} + 16px)`;

/** Map strip kept visible above the level-3 trip planner card (Uber-style). */
export const DRIVER_LEVEL3_TOP_PEEK_PX = 52;

/** CSS calc for total space occupied by the bottom nav + phone safe area. */
export const DRIVER_NAV_TOTAL_OFFSET = `calc(${DRIVER_NAV_CONTENT_PX}px + ${DRIVER_SAFE_BOTTOM})`;

/** Padding-bottom for scrollable content sitting above the nav bar. */
export const DRIVER_CONTENT_ABOVE_NAV = DRIVER_NAV_TOTAL_OFFSET;

/** Peek height of the home status sheet (handle + status row). */
export const DRIVER_SHEET_PEEK_PX = 80;

/** Jobs map navigation peek — handle, status, next stop, primary action, safe area. */
export const DRIVER_JOBS_NAV_SHEET_PEEK_PX = 204;

/** Jobs map peek with primary action but no navigation strip. */
export const DRIVER_JOBS_ACTION_SHEET_PEEK_PX = 136;

/** Max expanded job sheet height (px cap; also limited by viewport in component). */
export const DRIVER_JOBS_SHEET_EXPANDED_MAX_PX = 440;

export function driverJobsMapPeekHeight({ navigationMode = false, hasPrimaryAction = false } = {}) {
  if (navigationMode) return DRIVER_JOBS_NAV_SHEET_PEEK_PX;
  if (hasPrimaryAction) return DRIVER_JOBS_ACTION_SHEET_PEEK_PX;
  return DRIVER_SHEET_PEEK_PX;
}

/**
 * Level-3 trip planner height — stops below status bar + map peek so the card
 * top and drag handle stay visible (not edge-to-edge).
 */
export const DRIVER_LEVEL3_TOP_RESERVE = `calc(${DRIVER_SAFE_TOP} + ${DRIVER_LEVEL3_TOP_PEEK_PX}px)`;
export const DRIVER_LEVEL3_FULL_HEIGHT = `calc(100dvh - ${DRIVER_NAV_TOTAL_OFFSET} - ${DRIVER_LEVEL3_TOP_RESERVE})`;

/** Bottom offset for the GO button floating above the sheet + nav stack. */
export function driverGoButtonBottom(peekPx = DRIVER_SHEET_PEEK_PX) {
  return `calc(${DRIVER_SAFE_BOTTOM} + ${DRIVER_NAV_CONTENT_PX}px + ${peekPx}px + 16px)`;
}

/** Total chrome height: sheet peek + nav + safe area (for map overlays). */
export function driverBottomChromeHeight(peekPx = DRIVER_SHEET_PEEK_PX) {
  return `calc(${peekPx}px + ${DRIVER_NAV_CONTENT_PX}px + ${DRIVER_SAFE_BOTTOM})`;
}

/** Go online/offline bar height in home overview bottom chrome (px). */
export const DRIVER_OVERVIEW_GO_BAR_PX = 72;

/** Scroll padding for home overview (go bar + tab nav + safe area). */
export const DRIVER_OVERVIEW_SCROLL_BOTTOM = `calc(${DRIVER_NAV_TOTAL_OFFSET} + ${DRIVER_OVERVIEW_GO_BAR_PX}px)`;
