/** Bottom-nav route matching for brand IA: Home · Checks · Vehicles · Yard · More */

export function isChecksNavActive(pathname: string): boolean {
  return pathname.startsWith("/checks") || /\/yard\/[^/]+\/check/.test(pathname);
}

export function isVehiclesNavActive(pathname: string): boolean {
  if (!pathname.startsWith("/yard")) return false;
  if (pathname === "/yard/map" || pathname.startsWith("/yard/map/")) return false;
  return true;
}

export function isYardNavActive(pathname: string): boolean {
  return (
    pathname.startsWith("/yard/map")
    || pathname === "/arrivals"
    || pathname === "/departure-line"
    || pathname === "/movements"
    || pathname === "/scan"
  );
}

export function isMoreNavActive(pathname: string): boolean {
  return (
    pathname.startsWith("/more")
    || pathname.startsWith("/tasks")
    || pathname.startsWith("/inspections")
    || pathname.startsWith("/defects")
    || pathname.startsWith("/vor")
    || pathname.startsWith("/shift")
  );
}
