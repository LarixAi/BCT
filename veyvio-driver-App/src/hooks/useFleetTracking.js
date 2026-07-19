import { useCallback, useEffect, useState } from "react";
import { startFleetTrackingPings, readCurrentSpeedMph } from "@/services/driver-location-ping.service";
import { ensureFleetSessionForOpenShift, getActiveFleetSession } from "@/services/fleet-tracking.service";

/**
 * Duty-scoped fleet tracking: GPS pings while signed on, plus live speed for UI.
 * Posts to Command Live Ops even when the legacy fleet session table is empty.
 */
export function useFleetTracking({ driver, active, dutyId = null }) {
  const [session, setSession] = useState(null);
  const [speedMph, setSpeedMph] = useState(null);
  const [speedLimitMph, setSpeedLimitMph] = useState(null);
  const [accuracyMeters, setAccuracyMeters] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [pingError, setPingError] = useState("");

  const refreshSession = useCallback(async () => {
    if (!driver?.id) {
      setSession(null);
      return null;
    }
    let next = await getActiveFleetSession(driver);
    if (!next) {
      next = await ensureFleetSessionForOpenShift(driver);
    }
    setSession(next);
    return next;
  }, [driver]);

  useEffect(() => {
    if (!active || !driver?.id) {
      setSession(null);
      return undefined;
    }

    let cancelled = false;
    void refreshSession().then((s) => {
      if (!cancelled && !s) setSession(null);
    });

    const stopPings = startFleetTrackingPings({
      driver,
      active: true,
      dutyId,
      onPing: ({ speedMph: speed, speedLimitMph: limit, accuracyMeters: accuracy, batteryLevel: battery, recordedAt, ok, message }) => {
        if (ok === false && message) {
          setPingError(message);
        } else if (ok === true) {
          setPingError("");
        }
        if (typeof speed === "number") setSpeedMph(speed);
        if (typeof limit === "number") setSpeedLimitMph(limit);
        if (typeof accuracy === "number") setAccuracyMeters(accuracy);
        if (typeof battery === "number") setBatteryLevel(battery);
        if (recordedAt) setLastSyncAt(recordedAt);
      },
    });

    const speedInterval = window.setInterval(() => {
      void readCurrentSpeedMph().then(({ speedMph: speed, accuracyMeters: accuracy }) => {
        if (typeof speed === "number") setSpeedMph(speed);
        if (typeof accuracy === "number") setAccuracyMeters(accuracy);
      });
    }, 5_000);

    const sessionInterval = window.setInterval(() => {
      void refreshSession();
    }, 30_000);

    return () => {
      cancelled = true;
      stopPings();
      window.clearInterval(speedInterval);
      window.clearInterval(sessionInterval);
    };
  }, [active, driver, dutyId, refreshSession]);

  return {
    session,
    trackingActive: active,
    speedMph,
    speedLimitMph,
    accuracyMeters,
    batteryLevel,
    lastSyncAt,
    pingError,
    refreshSession,
  };
}
