/**
 * useDriverLocationBeacon
 *
 * Continuously updates the Driver entity's current_lat/lng while the driver
 * is marked online. This is the "availability beacon" — separate from the
 * TfL trip heartbeat (useLocationHeartbeat) which only logs during active jobs.
 *
 * - Fires every 15 seconds while active=true
 * - Writes directly to Driver entity so dispatch engine can locate the driver
 * - Silently handles GPS unavailability without blocking the UI
 */
import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const BEACON_INTERVAL_MS = 30_000; // 30s — reduces API load while staying within staleness window

export function useDriverLocationBeacon({ driverId, active }) {
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastPositionRef = useRef(null);

  useEffect(() => {
    if (!active || !driverId) {
      // Driver went offline — clear their coordinates so they don't appear as stale
      if (driverId && !active) {
        base44.entities.Driver.update(driverId, {
          current_lat: null,
          current_lng: null,
          last_location_update: null,
        }).catch(() => {});
      }
      return;
    }

    // Start watching GPS position
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          lastPositionRef.current = pos;
        },
        () => {
          // GPS unavailable — don't crash, dispatch engine has no-GPS fallback
        },
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 }
      );
    }

    const sendBeacon = async () => {
      const pos = lastPositionRef.current;
      if (!pos) return; // No GPS fix yet — skip this tick

      await base44.entities.Driver.update(driverId, {
        current_lat: parseFloat(pos.coords.latitude.toFixed(6)),
        current_lng: parseFloat(pos.coords.longitude.toFixed(6)),
        last_location_update: new Date().toISOString(),
      }).catch(() => {}); // Silent — never block driver UI
    };

    // Send first beacon immediately (after 2s for GPS to acquire fix)
    const initialTimer = setTimeout(sendBeacon, 2_000);
    intervalRef.current = setInterval(sendBeacon, BEACON_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalRef.current);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [active, driverId]);
}