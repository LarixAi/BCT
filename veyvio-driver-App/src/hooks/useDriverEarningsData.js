import { useState, useEffect, useMemo } from "react";
import { subMonths } from "date-fns";
import { base44 } from "@/api/base44Client";
import { withTimeout } from "@/lib/withTimeout";
import {
  computeTodayStats,
  computeWeekStats,
  computeMonthStats,
  computeLastWeekStats,
  buildWeekDayChart,
  buildMonthlyChart,
  weekOverWeekChange,
} from "@/lib/driverStats";

const FETCH_TIMEOUT_MS = 10000;

export function useDriverEarningsData(driver, monthOffset = 0) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!driver?.id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    withTimeout(
      base44.entities.Booking.filter({ assigned_driver_id: driver.id }, "-completion_time", 500),
      FETCH_TIMEOUT_MS
    )
      .then(all => {
        if (cancelled) return;
        setJobs(all.filter(j => j.booking_status === "completed"));
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || "Failed to load earnings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [driver?.id]);

  const now = useMemo(() => new Date(), [jobs, monthOffset]);

  const stats = useMemo(() => {
    const today = computeTodayStats(jobs);
    const week = computeWeekStats(jobs, now);
    const lastWeek = computeLastWeekStats(jobs, now);
    const monthDate = subMonths(now, monthOffset);
    const month = computeMonthStats(jobs, monthDate);
    const weekChart = buildWeekDayChart(jobs, week.weekStart, now);
    const monthChart = buildMonthlyChart(jobs, monthDate);
    const wow = weekOverWeekChange(week.net, lastWeek.net);
    const avgTrip = week.trips > 0 ? week.net / week.trips : 0;
    const captured = jobs.filter(j => j.payment_status === "captured").length;
    const pendingPay = jobs.filter(j => j.payment_status && j.payment_status !== "captured").length;

    return {
      today,
      week,
      lastWeek,
      month,
      weekChart,
      monthChart,
      wow,
      avgTrip,
      captured,
      pendingPay,
      monthDate,
    };
  }, [jobs, now, monthOffset]);

  return { jobs, loading, error, stats };
}
