import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { canUse } from "@veyvio/entitlements";
import { AppShell } from "@/components/yard/shells/AppShell";
import { SheetHost } from "@/components/yard/sheets";
import { getSessionSnapshot, useSessionStore } from "@/platform/auth/session-store";
import { getTenancySnapshot, useTenancyStore } from "@/platform/tenancy/context-store";
import { DEFAULT_MOCK_ROLE, MOCK_COMPANIES, MOCK_DEPOTS } from "@/data/mocks/tenancy";
import { hydrateYardFromApi } from "@/platform/yard/hydrate-yard-store";
import { ensureDevBypassBootstrap } from "@/platform/yard/dev-bypass-bootstrap";
import { yardCopy } from "@/copy/yard-messages";
import { useYard } from "@/store/yard";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
ensureDevBypassBootstrap();
const OPS_POLL_MS = 8_000;
const HUB_REFRESH_MS = 30_000;

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (DEV_BYPASS) {
      const tenancy = getTenancySnapshot();
      if (tenancy.depotId !== "dep_bct_main") {
        const company = MOCK_COMPANIES.find(c => c.id === "co_bct");
        const depot = MOCK_DEPOTS.find(d => d.id === "dep_bct_main");
        if (company && depot) {
          useTenancyStore.getState().selectCompany(company, DEFAULT_MOCK_ROLE);
          useTenancyStore.getState().selectDepot(depot);
        }
      }
      return;
    }

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
        <YardHydrationGate>
          <Outlet />
        </YardHydrationGate>
      </AppShell>
      <SheetHost />
    </>
  );
}

function YardHydrationGate({ children }: { children: ReactNode }) {
  const hydrated = useYard(s => s.hydrated);
  if (DEV_BYPASS || hydrated) return children;
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      <p className="text-sm font-medium text-muted">{yardCopy.connection.loadingDepot}</p>
    </div>
  );
}

function YardBootstrapHydrator() {
  const companyId = useTenancyStore(s => s.companyId);
  const depotId = useTenancyStore(s => s.depotId);
  const role = useTenancyStore(s => s.role);

  useEffect(() => {
    if (DEV_BYPASS) {
      ensureDevBypassBootstrap();
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
