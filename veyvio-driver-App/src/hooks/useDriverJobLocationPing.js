/**
 * @deprecated Use useFleetTracking for duty-scoped tracking instead.
 */
import { useFleetTracking } from "@/hooks/useFleetTracking";

export function useDriverJobLocationPing({ job, driver, active }) {
  const jobActive =
    active &&
    job?.id &&
    job?.assignment?.startedAt &&
    job?.status !== "completed" &&
    job?.status !== "cancelled";

  return useFleetTracking({
    driver,
    active: Boolean(jobActive && driver?.id),
  });
}
