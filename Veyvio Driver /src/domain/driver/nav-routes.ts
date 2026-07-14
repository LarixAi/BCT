export function isTripsNavActive(pathname: string): boolean {
  return pathname.startsWith("/trips") || pathname.startsWith("/duties");
}

export function isChecksNavActive(pathname: string): boolean {
  return pathname.startsWith("/checks");
}

export function isMessagesNavActive(pathname: string): boolean {
  return pathname.startsWith("/messages");
}

export function isMoreNavActive(pathname: string): boolean {
  return pathname.startsWith("/more");
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
