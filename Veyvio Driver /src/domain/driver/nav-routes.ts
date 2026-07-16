import {
  getDriverPrimaryTab,
  shouldShowDriverBottomNav,
} from "@/domain/driver/navigation-policy";

export { getDriverPrimaryTab, shouldShowDriverBottomNav };

/** @deprecated Prefer getDriverPrimaryTab — hub-exact active state */
export function isTripsNavActive(pathname: string): boolean {
  return getDriverPrimaryTab(pathname) === "duties";
}

/** @deprecated Prefer getDriverPrimaryTab — hub-exact active state */
export function isChecksNavActive(pathname: string): boolean {
  return getDriverPrimaryTab(pathname) === "checks";
}

/** @deprecated Prefer getDriverPrimaryTab — hub-exact active state */
export function isMessagesNavActive(pathname: string): boolean {
  return getDriverPrimaryTab(pathname) === "messages";
}

/** @deprecated Prefer getDriverPrimaryTab — hub-exact active state */
export function isMoreNavActive(pathname: string): boolean {
  return getDriverPrimaryTab(pathname) === "more";
}

export function isJourneyWizardRoute(pathname: string): boolean {
  return /\/journey\/(open|end)/.test(pathname);
}

export function isNavRoute(pathname: string): boolean {
  return /\/duties\/[^/]+\/nav/.test(pathname);
}

/** @deprecated use isJourneyWizardRoute */
export function isOpenJourneyRoute(pathname: string): boolean {
  return isJourneyWizardRoute(pathname);
}

export function isActiveDutyRoute(pathname: string): boolean {
  return /^\/duties\/[^/]+/.test(pathname) && !isJourneyWizardRoute(pathname) && !isNavRoute(pathname);
}

export function isHomeRoute(pathname: string): boolean {
  return pathname === "/";
}

/** Duties list (`/trips`) — same clean full-bleed shell as Home */
export function isDutiesListRoute(pathname: string): boolean {
  return pathname === "/trips" || pathname === "/trips/";
}

/** Checks workspace (`/checks` root only — wizards keep chrome) */
export function isChecksListRoute(pathname: string): boolean {
  return pathname === "/checks" || pathname === "/checks/";
}

/** Messages workspace (`/messages` root only — thread/new/search keep chrome) */
export function isMessagesListRoute(pathname: string): boolean {
  return pathname === "/messages" || pathname === "/messages/";
}

/** More hub (`/more` root only — settings subpages keep chrome) */
export function isMoreListRoute(pathname: string): boolean {
  return pathname === "/more" || pathname === "/more/";
}

/** Home or Duties list — own status strip; hide Midnight chrome */
export function isCleanShellRoute(pathname: string): boolean {
  return isHomeRoute(pathname) || isDutiesListRoute(pathname) || isMoreListRoute(pathname);
}

/**
 * Splash focused light chrome: nested detail / wizards / incidents.
 * No Midnight AppChromeHeader · no BottomNav · page owns ← back header.
 * Journey open/end and map nav stay immersive (own shells).
 */
export function isFocusedLightRoute(pathname: string): boolean {
  if (
    isHomeRoute(pathname) ||
    isDutiesListRoute(pathname) ||
    isChecksListRoute(pathname) ||
    isMessagesListRoute(pathname) ||
    isMoreListRoute(pathname)
  ) {
    return false;
  }
  if (isJourneyWizardRoute(pathname) || isNavRoute(pathname)) {
    return false;
  }
  return (
    pathname.startsWith("/checks/") ||
    pathname.startsWith("/messages/") ||
    pathname.startsWith("/more/") ||
    pathname.startsWith("/incidents") ||
    pathname.startsWith("/trips/") ||
    /^\/duties\//.test(pathname)
  );
}
