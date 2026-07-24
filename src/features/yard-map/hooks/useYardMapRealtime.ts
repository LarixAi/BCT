import { useEffect } from "react";
import { bindSupabaseSession, getSupabaseClient } from "@/platform/supabase/client";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { hydrateYardFromApi } from "@/platform/yard/hydrate-yard-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useYardMapRefresh } from "@/features/yard-map/hooks/useYardMapRefresh";

/**
 * Live Yard Map updates via Supabase Realtime (vehicle_locations, parking_bays).
 * Falls back to hub polling when Supabase is not configured.
 */
export function useYardMapRealtime(enabled: boolean) {
  const companyId = useTenancyStore(s => s.companyId);
  const depotId = useTenancyStore(s => s.depotId);
  const role = useTenancyStore(s => s.role);
  const hasSupabase = Boolean(getSupabaseClient());

  useYardMapRefresh(enabled && !hasSupabase, 10_000);

  useEffect(() => {
    if (!enabled || !companyId || !depotId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      void hydrateYardFromApi({
        companyId,
        depotId,
        role: (role as "yard_manager") ?? "yard_manager",
      });
    };

    const setup = async () => {
      const session = getSessionSnapshot();
      await bindSupabaseSession(session.accessToken);
      if (cancelled) return;

      const channel = supabase
        .channel(`yard-map-${depotId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vehicle_locations",
            filter: `depot_id=eq.${depotId}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "parking_bays",
            filter: `company_id=eq.${companyId},depot_id=eq.${depotId}`,
          },
          refresh,
        )
        .subscribe();

      return channel;
    };

    const channelPromise = setup();

    return () => {
      cancelled = true;
      void channelPromise.then(channel => {
        if (channel) void supabase.removeChannel(channel);
      });
    };
  }, [enabled, companyId, depotId, role]);
}
