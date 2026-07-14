import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AppOperationalBanners } from "./AppOperationalBanners";
import { AppChromeHeader } from "./AppChromeHeader";
import { BottomNav } from "./BottomNav";
import { DutySubnav } from "./DutySubnav";
import { useSyncLifecycle } from "@/features/sync/use-sync-lifecycle";
import { useDriverStore } from "@/store/driver";
import { isJourneyWizardRoute, isNavRoute } from "@/domain/driver/nav-routes";

export function AppShell({ children }: { children: ReactNode }) {
  const activeDutyId = useDriverStore((s) => s.activeDutyId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullBleedFlow = isJourneyWizardRoute(pathname) || isNavRoute(pathname);
  useSyncLifecycle();

  if (fullBleedFlow) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <AppChromeHeader />
      {activeDutyId ? <DutySubnav dutyId={activeDutyId} /> : null}
      <AppOperationalBanners />
      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
