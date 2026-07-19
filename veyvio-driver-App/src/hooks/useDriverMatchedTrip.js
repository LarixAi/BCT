import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MATCHED_TRIP_ACTIVE_STATUSES } from "@/lib/matchedTripDisplay";
import { getDriverJobsHub } from "@/services/jobs.service";
import {
  findPendingMatchedTripNotification,
  hasSeenMatchedTrip,
  loadMatchedTripForJob,
} from "@/services/driver-matched-trip.service";

/**
 * Surfaces the Uber-style "Matched to trip" card when a PHV job is assigned.
 */
export function useDriverMatchedTrip({ driver, userId, enabled = true }) {
  const location = useLocation();
  const [trip, setTrip] = useState(null);
  const [notificationId, setNotificationId] = useState(null);
  const loadingRef = useRef(false);

  const dismiss = useCallback(() => {
    setTrip(null);
    setNotificationId(null);
  }, []);

  const tryShowJob = useCallback(
    async (jobId, notifId = null) => {
      if (!enabled || !driver?.id || !jobId || loadingRef.current) return;

      const onJobPage = location.pathname === `/job/${jobId}`;
      if (onJobPage || hasSeenMatchedTrip(jobId)) return;

      loadingRef.current = true;
      try {
        const loaded = await loadMatchedTripForJob(jobId, driver.id);
        if (!loaded) return;
        setTrip(loaded);
        setNotificationId(notifId);
      } finally {
        loadingRef.current = false;
      }
    },
    [driver?.id, enabled, location.pathname],
  );

  useEffect(() => {
    if (!enabled || !driver?.id || !userId) return;

    void (async () => {
      const pending = await findPendingMatchedTripNotification(userId);
      if (pending?.jobId) {
        await tryShowJob(pending.jobId, pending.notificationId);
        return;
      }

      const hub = await getDriverJobsHub(driver.id);
      const freshPhv = hub.allJobs.find(
        (job) =>
          job.isPhvCustomerBooking &&
          MATCHED_TRIP_ACTIVE_STATUSES.has(job.status ?? "") &&
          !hasSeenMatchedTrip(job.id),
      );
      if (freshPhv?.id) {
        await tryShowJob(freshPhv.id);
      }
    })();
  }, [driver?.id, enabled, tryShowJob, userId]);

  useEffect(() => {
    if (!enabled || !driver?.id || !userId) return undefined;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`driver-matched-trip-${driver.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new;
          if (row?.notification_type !== "phv_trip_assigned" || !row.entity_id) return;
          void tryShowJob(row.entity_id, row.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_assignments",
          filter: `driver_id=eq.${driver.id}`,
        },
        (payload) => {
          const row = payload.new;
          if (!row?.is_current || !row.job_id) return;
          void tryShowJob(row.job_id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [driver?.id, enabled, tryShowJob, userId]);

  return {
    trip,
    notificationId,
    visible: Boolean(trip),
    dismiss,
  };
}
