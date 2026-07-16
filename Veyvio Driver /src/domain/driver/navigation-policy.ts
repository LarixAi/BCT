/**
 * Bottom navigation policy for Veyvio Driver.
 *
 * The five-tab bar belongs only to primary app hubs. Focused workflows and
 * nested detail pages use contextual back/home controls instead.
 */

export type DriverPrimaryTab = "home" | "duties" | "checks" | "messages" | "more";

const PRIMARY_TAB_PATHS: Readonly<Record<string, DriverPrimaryTab>> = {
  "/": "home",
  "/trips": "duties",
  // Supported for a future top-level route migration from /trips.
  "/duties": "duties",
  "/checks": "checks",
  "/messages": "messages",
  "/more": "more",
};

export function normalizeDriverPathname(pathname: string): string {
  if (!pathname) return "/";
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] || "/";
  if (withoutQuery === "/") return "/";
  return withoutQuery.replace(/\/+$/, "");
}

export function getDriverPrimaryTab(pathname: string): DriverPrimaryTab | null {
  return PRIMARY_TAB_PATHS[normalizeDriverPathname(pathname)] ?? null;
}

export function shouldShowDriverBottomNav(pathname: string): boolean {
  return getDriverPrimaryTab(pathname) !== null;
}

/**
 * Examples hidden by this policy:
 * - /duties/:dutyId and all duty/journey/navigation workflows
 * - /checks/verify, /checks/walkaround, /checks/defect, /checks/review
 * - /messages/:conversationId, /messages/new, /messages/search
 * - /more/* settings detail pages
 * - /trips/:assignmentId and history/change/cancellation details
 * - /incidents/*
 * - all public/auth/onboarding routes
 */

/** CSS length reserved for the fixed bottom nav + safe area. */
export const DRIVER_BOTTOM_NAV_OFFSET = "5.5rem";
