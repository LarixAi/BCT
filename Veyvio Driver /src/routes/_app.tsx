import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/driver/shells/AppShell";
import { getSessionSnapshot, useSessionStore } from "@/platform/auth/session-store";
import { getTenancySnapshot, useTenancyStore } from "@/platform/tenancy/context-store";
import { applyBootstrapToDriver, hydrateDriverFromCache } from "@/platform/driver/hydrate-driver-store";
import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import { seedDevContext } from "@/platform/dev/seed-dev-context";
import { isDevAuthBypassEnabled } from "@/platform/dev/dev-guards";

const DEV_BYPASS = isDevAuthBypassEnabled();

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (DEV_BYPASS) return;

    const session = getSessionSnapshot();
    const tenancy = getTenancySnapshot();

    const sessionValid =
      session.status === "authenticated" &&
      !!session.accessToken &&
      !!session.expiresAt &&
      new Date(session.expiresAt).getTime() > Date.now();

    if (!sessionValid) throw redirect({ to: "/splash" });
    if (!session.mfaVerified) throw redirect({ to: "/mfa" });
    if (!tenancy.companyId) throw redirect({ to: "/company-select" });
    if (!tenancy.depotId) throw redirect({ to: "/depot-select" });
    if (!session.bootstrapComplete) throw redirect({ to: "/initial-sync" });
    if (!session.hasCompletedDriverOnboarding) throw redirect({ to: "/onboarding/1" });
    if (session.biometricEnabled && !session.biometricUnlockedThisSession) {
      throw redirect({ to: "/biometric-unlock" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <>
      <DriverBootstrapHydrator />
      <AppShell>
        <Outlet />
      </AppShell>
    </>
  );
}

function DriverBootstrapHydrator() {
  const depotId = useTenancyStore((s) => s.depotId);
  const companyId = useTenancyStore((s) => s.companyId);
  const driverId = useTenancyStore((s) => s.driverId);

  useEffect(() => {
    if (DEV_BYPASS) {
      seedDevContext();
      const { companyId, depotId, driverId } = useTenancyStore.getState();
      if (companyId && depotId && driverId) {
        applyBootstrapToDriver(buildBootstrapPayload(companyId, depotId, driverId));
      }
      return;
    }
    if (!depotId) return;
    void hydrateDriverFromCache(depotId);
  }, [depotId, companyId, driverId]);

  return null;
}

export function useAppAuthenticated() {
  return useSessionStore((s) => s.isAuthenticated()) && useTenancyStore((s) => s.isContextComplete());
}
