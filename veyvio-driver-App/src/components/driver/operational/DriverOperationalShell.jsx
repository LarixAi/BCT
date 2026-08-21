import { useEffect, useState, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import DriverOperationalBottomNav from "./DriverOperationalBottomNav";
import DriverPageLoader from "./DriverPageLoader";
import { DRIVER_CONTENT_ABOVE_NAV, DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";
import { op } from "@/lib/driver-operational-theme";
import { DriverChromeContext } from "@/lib/driverChromeContext";

/**
 * Primary tab routes + message stack always keep the bottom nav.
 * Full-screen wizard steps hide it via setHideBottomNav (checklist / review).
 */
function showBottomNav(pathname) {
  // Vehicle check hub is a primary tab — keep the bar. Wizard hides via chrome flag.
  if (pathname === "/check" || pathname.startsWith("/check/")) return true;

  if (pathname === "/" || pathname === "/jobs" || pathname === "/more") {
    return true;
  }

  // Messages tab + stack — keep nav so back from contact/threads never blanks it
  if (
    pathname === "/messages" ||
    pathname === "/notifications" ||
    pathname === "/contact" ||
    pathname.startsWith("/threads/")
  ) {
    return true;
  }

  return false;
}

export default function DriverOperationalShell() {
  const { pathname } = useLocation();
  const [hideBottomNav, setHideBottomNav] = useState(false);
  const routeWantsNav = showBottomNav(pathname);
  const showNav = routeWantsNav && !hideBottomNav;

  // Clear a stuck hide flag when returning to a tab that should show nav.
  useEffect(() => {
    if (routeWantsNav) setHideBottomNav(false);
  }, [pathname, routeWantsNav]);

  return (
    <DriverChromeContext.Provider value={{ hideBottomNav, setHideBottomNav }}>
      <div className={`min-h-dvh ${op.pageBg} ${op.text}`}>
        <div
          className="max-w-lg mx-auto min-h-dvh"
          style={{
            paddingBottom: showNav ? DRIVER_CONTENT_ABOVE_NAV : `calc(20px + ${DRIVER_SAFE_BOTTOM})`,
          }}
        >
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center">
                <DriverPageLoader />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
        {showNav ? <DriverOperationalBottomNav /> : null}
      </div>
    </DriverChromeContext.Provider>
  );
}
