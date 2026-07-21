import { prefetchRoute } from "@core-support/fleet-shared";

export const DRIVER_ROUTE_PREFETCH = {
  "/jobs": () => import("@/pages/driver/DriverJobsHub"),
  "/check": () => import("@/pages/driver/DriverWalkaroundFlow"),
  "/notifications": () => import("@/pages/driver/DriverNotificationsPage"),
  "/messages": () => import("@/pages/driver/DriverSupabaseMessages"),
  "/profile": () => import("@/pages/driver/DriverSupabaseProfile"),
};

export function prefetchDriverRoute(path) {
  prefetchRoute(DRIVER_ROUTE_PREFETCH[path]);
}

export function prefetchDriverLikelyRoutes() {
  prefetchDriverRoute("/jobs");
}
