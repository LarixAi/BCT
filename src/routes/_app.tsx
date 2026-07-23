import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { canUse } from "@veyvio/entitlements";
import { AppShell } from "@/components/yard/shells/AppShell";
import { SheetHost } from "@/components/yard/sheets";
import { getSessionSnapshot, useSessionStore } from "@/platform/auth/session-store";
import { getTenancySnapshot, useTenancyStore } from "@/platform/tenancy/context-store";
import { hydrateYardFromApi } from "@/platform/yard/hydrate-yard-store";
import { useYard } from "@/store/yard";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
const OPS_POLL_MS = 8_000;
const HUB_REFRESH_MS = 30_000;

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

    // Soft-open until entitlements load; once present, Yard requires the yard module.
    if (!canUse(session.enabledModules, "yard")) {
      throw redirect({ to: "/module-unavailable" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <>
      <YardBootstrapHydrator />
      <YardOpsIngestor />
      <AppShell>
        <Outlet />
      </AppShell>
      <SheetHost />
    </>
  );
}

function YardBootstrapHydrator() {
  const companyId = useTenancyStore(s => s.companyId);
  const depotId = useTenancyStore(s => s.depotId);
  const role = useTenancyStore(s => s.role);

  useEffect(() => {
    if (DEV_BYPASS) {
      if (useYard.getState().vehicles.length === 0) {
        void hydrateYardFromApi({
          companyId: "e2e-co",
          depotId: "e2e-depot",
          role: "yard_manager",
        });
      }
      return;
    }
    if (!companyId || !depotId) return;
    void hydrateYardFromApi({
      companyId,
      depotId,
      role: (role as "yard_manager") ?? "yard_manager",
    });

    const refreshId = window.setInterval(() => {
      void hydrateYardFromApi({
        companyId,
        depotId,
        role: (role as "yard_manager") ?? "yard_manager",
      });
    }, HUB_REFRESH_MS);

    return () => window.clearInterval(refreshId);
  }, [companyId, depotId, role]);

  return null;
}

/** Live ingest of driver journey starts / plan publishes while the app is open. */
function YardOpsIngestor() {
  const processIncomingOpsNotices = useYard(s => s.processIncomingOpsNotices);

  useEffect(() => {
    const tick = () => {
      processIncomingOpsNotices();
    };
    tick();
    const id = window.setInterval(tick, OPS_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [processIncomingOpsNotices]);

  return null;
}

/** Hook for components that need to know auth is active */
export function useAppAuthenticated() {
  const authenticated = useSessionStore(s => s.isAuthenticated());
  const contextComplete = useTenancyStore(s => s.isContextComplete());
  return authenticated && contextComplete;
}
