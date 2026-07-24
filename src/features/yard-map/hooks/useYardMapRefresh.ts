import { useEffect } from "react";
import { hydrateYardFromApi } from "@/platform/yard/hydrate-yard-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";

/** Faster hub refresh while Live Yard Map is open (Phase 2 bridge until Realtime). */
export function useYardMapRefresh(enabled: boolean, intervalMs = 10_000) {
  const companyId = useTenancyStore(s => s.companyId);
  const depotId = useTenancyStore(s => s.depotId);
  const role = useTenancyStore(s => s.role);

  useEffect(() => {
    if (!enabled || !companyId || !depotId) return;
    const tick = () => {
      void hydrateYardFromApi({
        companyId,
        depotId,
        role: (role as "yard_manager") ?? "yard_manager",
      });
    };
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, companyId, depotId, role, intervalMs]);
}
