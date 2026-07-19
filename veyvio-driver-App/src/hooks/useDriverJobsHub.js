import { useCallback, useEffect, useState } from "react";
import { getDriverJobsHub } from "@/services/jobs.service";

export function useDriverJobsHub(driverId) {
  const [data, setData] = useState({
    current: null,
    upcoming: [],
    completedToday: [],
    unclaimed: [],
    allJobs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!driverId) return;
    setError(null);
    try {
      const hub = await getDriverJobsHub(driverId);
      setData(hub);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  return { ...data, loading, error, reload };
}
