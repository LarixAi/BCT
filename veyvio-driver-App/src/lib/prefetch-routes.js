export const DRIVER_ROUTE_PREFETCH = {
  "/jobs": () => import("@/pages/driver/DriverJobsHub"),
  "/check": () => import("@/pages/driver/DriverWalkaroundFlow"),
  "/more": () => import("@/pages/driver/DriverMorePage"),
  "/documents": () => import("@/pages/driver/DriverSupabaseDocuments"),
  "/duty": () => import("@/pages/driver/DriverMyDuty"),
  "/notifications": () => import("@/pages/driver/DriverNotificationsPage"),
  "/messages": () => import("@/pages/driver/DriverSupabaseMessages"),
  "/profile": () => import("@/pages/driver/DriverSupabaseProfile"),
  "/profile/settings": () => import("@/pages/driver/DriverSupabaseSettings"),
  "/training": () => import("@/pages/driver/DriverTrainingCentre"),
};

function prefetchRoute(loader) {
  if (typeof loader === "function") {
    void loader().catch(() => {});
  }
}

export function prefetchDriverRoute(path) {
  prefetchRoute(DRIVER_ROUTE_PREFETCH[path]);
}

export function prefetchDriverLikelyRoutes() {
  prefetchDriverRoute("/jobs");
}
