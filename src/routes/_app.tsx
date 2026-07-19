import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/yard/shells/AppShell";
import { SheetHost } from "@/components/yard/sheets";
import { getSessionSnapshot, useSessionStore } from "@/platform/auth/session-store";
import { getTenancySnapshot, useTenancyStore } from "@/platform/tenancy/context-store";
import { applyBootstrapToYard, hydrateYardFromCache } from "@/platform/yard/hydrate-yard-store";
import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import { useYard } from "@/store/yard";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

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
    if (session.biometricEnabled && session.trustedDevice && !session.biometricUnlockedThisSession) {
      throw redirect({ to: "/biometric-unlock" });
    }
    if (!tenancy.companyId) throw redirect({ to: "/company-select" });
    if (!tenancy.depotId) throw redirect({ to: "/depot-select" });
    if (!session.bootstrapComplete) throw redirect({ to: "/initial-sync" });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <>
      <YardBootstrapHydrator />
      <AppShell>
        <Outlet />
      </AppShell>
      <SheetHost />
    </>
  );
}

function YardBootstrapHydrator() {
  const depotId = useTenancyStore(s => s.depotId);

  useEffect(() => {
    if (DEV_BYPASS) {
      if (useYard.getState().vehicles.length === 0) {
        applyBootstrapToYard(buildBootstrapPayload("e2e-co", "e2e-depot", "yard_manager"));
      }
      return;
    }
    if (!depotId) return;
    void hydrateYardFromCache(depotId);
  }, [depotId]);

  return null;
}

/** Hook for components that need to know auth is active */
export function useAppAuthenticated() {
  const authenticated = useSessionStore(s => s.isAuthenticated());
  const contextComplete = useTenancyStore(s => s.isContextComplete());
  return authenticated && contextComplete;
}
