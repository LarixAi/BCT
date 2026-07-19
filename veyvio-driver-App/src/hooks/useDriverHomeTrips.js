import { useEffect, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useDriverJobsHub } from "@/hooks/useDriverJobsHub";

const UPCOMING_HOME_LIMIT = 3;

/**
 * Today's trips for the driver home screen (B1 + B2).
 * Loads assigned jobs when signed on and subscribes to assignment/job updates.
 */
export function useDriverHomeTrips(driverId, isSignedOn) {
  const enabled = Boolean(driverId && isSignedOn);
  const hub = useDriverJobsHub(enabled ? driverId : null);

  const upcomingPreview = useMemo(
    () => hub.upcoming.slice(0, UPCOMING_HOME_LIMIT),
    [hub.upcoming],
  );

  const jobIdsKey = useMemo(
    () => hub.allJobs.map((j) => j.id).sort().join(","),
    [hub.allJobs],
  );

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`driver-home-trips-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_assignments",
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          void hub.reload();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [driverId, enabled, hub.reload]);

  useEffect(() => {
    if (!enabled || !jobIdsKey) return;

    const jobIds = jobIdsKey.split(",").filter(Boolean);
    const supabase = getSupabaseClient();
    const channel = supabase.channel(`driver-home-jobs-${driverId}-${jobIdsKey}`);

    for (const jobId of jobIds) {
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        () => {
          void hub.reload();
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [driverId, enabled, jobIdsKey, hub.reload]);

  return {
    current: hub.current,
    upcoming: upcomingPreview,
    upcomingTotal: hub.upcoming.length,
    unclaimed: hub.unclaimed,
    loading: enabled ? hub.loading : false,
    error: hub.error,
    reload: hub.reload,
    hasTrips: Boolean(hub.current || hub.upcoming.length || hub.unclaimed.length),
  };
}
