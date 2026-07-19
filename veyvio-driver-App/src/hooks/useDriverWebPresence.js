import { useEffect } from "react";
import { touchDriverWebPresence } from "@/services/push-registration.service";

const PRESENCE_INTERVAL_MS = 60_000;

/** Keeps driver_devices.last_seen_at fresh while the driver app is open in a browser. */
export function useDriverWebPresence({ driverId, userId, organisationId, active }) {
  useEffect(() => {
    if (!active || !driverId || !userId || !organisationId) return;

    let cancelled = false;

    const ping = () => {
      if (cancelled) return;
      void touchDriverWebPresence({ driverId, userId, organisationId });
    };

    ping();
    const interval = setInterval(ping, PRESENCE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active, driverId, userId, organisationId]);
}
