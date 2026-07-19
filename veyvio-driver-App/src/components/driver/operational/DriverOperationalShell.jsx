import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import DriverOperationalBottomNav from "./DriverOperationalBottomNav";
import { DRIVER_CONTENT_ABOVE_NAV, DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";
import { op } from "@/lib/driver-operational-theme";
import { DriverChromeContext } from "@/lib/driverChromeContext";

/**
 * Primary tab routes + message stack always keep the bottom nav.
 * Full-screen flows (walkaround wizard) hide it via setHideBottomNav.
 */
function showBottomNav(pathname) {
  // Walkaround wizard owns the full screen at /check — history/vehicles keep the tab bar.
  if (pathname === "/check") return false;
  if (pathname.startsWith("/check/")) return true;

  if (pathname === "/" || pathname === "/jobs" || pathname === "/more") {
    return true;
  }

  // Messages tab + stack — keep nav so back from contact/threads never blanks it
  if (
    pathname === "/messages" ||
    pathname === "/notifications" ||
    pathname === "/contact" ||
    pathname === "/threads" ||
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
          <Outlet />
        </div>
        {showNav ? <DriverOperationalBottomNav /> : null}
      </div>
    </DriverChromeContext.Provider>
  );
}
