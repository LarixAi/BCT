import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AppOperationalBanners } from "./AppOperationalBanners";
import { AppChromeHeader } from "./AppChromeHeader";
import { BottomNav } from "./BottomNav";
import { DutySubnav } from "./DutySubnav";
import { VehicleCheckRequiredStrip } from "./VehicleCheckRequiredStrip";
import { useSyncLifecycle } from "@/features/sync/use-sync-lifecycle";
import { useDriverStore } from "@/store/driver";
import {
  isChecksListRoute,
  isDutiesListRoute,
  isFocusedLightRoute,
  isHomeRoute,
  isJourneyWizardRoute,
  isMessagesListRoute,
  isMoreListRoute,
  isNavRoute,
} from "@/domain/driver/nav-routes";
import {
  shouldShowDriverBottomNav,
} from "@/domain/driver/navigation-policy";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const activeDutyId = useDriverStore((s) => s.activeDutyId);
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showBottomNav = shouldShowDriverBottomNav(pathname);
  const workspaceHub =
    isDutiesListRoute(pathname) ||
    isChecksListRoute(pathname) ||
    isMessagesListRoute(pathname);
  const immersiveFlow = isJourneyWizardRoute(pathname) || isNavRoute(pathname);
  const homeScreen = isHomeRoute(pathname);
  const moreHub = isMoreListRoute(pathname);
  const cleanPad = homeScreen || moreHub;
  const focusedLight = isFocusedLightRoute(pathname);
  const showVehicleCheckStrip = shouldShowVehicleCheckRequiredStrip(homeSummary);
  useSyncLifecycle();

  /* In-trip map / journey wizards — strip stays visible until check is clear */
  if (immersiveFlow) {
    return (
      <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
        {showVehicleCheckStrip ? <VehicleCheckRequiredStrip /> : null}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  /* Duties / Checks / Messages hubs — canvas + sheet above hub tabs */
  if (workspaceHub) {
    return (
      <div className="flex h-dvh flex-col bg-background text-foreground">
        {showVehicleCheckStrip ? <VehicleCheckRequiredStrip /> : null}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        {/* Docked so sheet footers (View route / Passengers) sit above nav */}
        <BottomNav docked />
      </div>
    );
  }

  /* Focused detail pages — strip above ← back chrome */
  if (focusedLight) {
    return (
      <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
        {showVehicleCheckStrip ? <VehicleCheckRequiredStrip /> : null}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground",
        showBottomNav && "pb-28",
      )}
    >
      {showVehicleCheckStrip ? <VehicleCheckRequiredStrip /> : null}
      {!cleanPad ? <AppChromeHeader /> : null}
      {!cleanPad && activeDutyId ? <DutySubnav dutyId={activeDutyId} /> : null}
      {!cleanPad ? <AppOperationalBanners /> : null}
      <main
        className={cn(
          "mx-auto max-w-lg",
          cleanPad ? "px-0 py-0" : "px-4 py-5",
        )}
      >
        {children}
      </main>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
