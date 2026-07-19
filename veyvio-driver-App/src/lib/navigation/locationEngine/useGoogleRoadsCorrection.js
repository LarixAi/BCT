/**
 * Phase 4 — periodic Google Roads (Snap-to-Roads) correction loop.
 *
 * - Buffers recent **filtered** fixes from the location engine.
 * - Every `intervalMs` (default 30 s) sends the buffered points to the
 *   `driver-snap-to-roads` edge function.
 * - Computes the average drift between Turf-snapped and Roads-snapped
 *   positions so the diagnostics overlay can show whether Roads is
 *   contributing a meaningful correction.
 * - Does NOT mutate the displayed marker by default. If a route polyline is
 *   provided we additionally reject any Roads result whose distance to the
 *   route is greater than `maxRouteOffsetM` — protects against
 *   wrong-road / parallel-street snapping (per the research report).
 *
 * Default-OFF: only runs when `VITE_NAV_USE_GOOGLE_ROADS=true`.
 */
import { useEffect, useRef, useState } from "react";
import { snapPointsToRoads, ROADS_MAX_POINT_SPACING_M } from "@/services/driverRoadsService";
import { snapToRouteLine } from "@/lib/navigation/locationEngine/snapToRoute";
import { haversineMeters } from "@/lib/smoothGps";

const DEFAULT_INTERVAL_MS = 30_000;
const MIN_BATCH_POINTS = 4;
const MAX_BATCH_POINTS = 50;

function isRoadsEnabled() {
  return import.meta.env.VITE_NAV_USE_GOOGLE_ROADS === "true";
}

export function useGoogleRoadsCorrection({
  filteredLocation,
  routeLine,
  enabled = false,
  intervalMs = DEFAULT_INTERVAL_MS,
  maxRouteOffsetM = 35,
} = {}) {
  const featureEnabled = enabled && isRoadsEnabled();
  const bufferRef = useRef([]);
  const lastCheckedAtRef = useRef(0);
  const inflightRef = useRef(false);
  const [state, setState] = useState({
    enabled: featureEnabled,
    fallbackReason: null,
    driftMetres: null,
    pointsChecked: 0,
    lastCheckedAt: null,
    quota: null,
    rejectedByRouteGuard: false,
  });

  // Buffer fixes (only when feature enabled).
  useEffect(() => {
    if (!featureEnabled || !filteredLocation) return;
    const lat = filteredLocation.latitude ?? filteredLocation.lat;
    const lng = filteredLocation.longitude ?? filteredLocation.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const buf = bufferRef.current;
    const last = buf[buf.length - 1];
    // Only push when we've moved meaningfully — Google docs recommend
    // ≤ 300 m spacing but ≥ ~10 m so we don't fill the batch with stationary fixes.
    if (last) {
      const moved = haversineMeters(last.latitude, last.longitude, lat, lng);
      if (moved < 10) return;
      if (moved > ROADS_MAX_POINT_SPACING_M) {
        // Long jump (tunnel exit, app resume) — clear buffer and start fresh.
        bufferRef.current = [{ latitude: lat, longitude: lng }];
        return;
      }
    }
    buf.push({ latitude: lat, longitude: lng });
    if (buf.length > MAX_BATCH_POINTS) buf.shift();
  }, [filteredLocation, featureEnabled]);

  // Periodic flush.
  useEffect(() => {
    if (!featureEnabled) return undefined;
    let cancelled = false;

    const flush = async () => {
      if (inflightRef.current) return;
      const buf = bufferRef.current;
      if (buf.length < MIN_BATCH_POINTS) return;
      inflightRef.current = true;
      const sample = [...buf];

      try {
        const { snappedPoints, fallback, reason, quota } = await snapPointsToRoads({
          points: sample,
        });
        if (cancelled) return;

        if (fallback) {
          setState((prev) => ({
            ...prev,
            enabled: true,
            fallbackReason: reason ?? "fallback",
            quota: quota ?? prev.quota,
          }));
          return;
        }

        // Compare last raw vs Google's last snapped point.
        const lastRaw = sample[sample.length - 1];
        const lastSnapped = snappedPoints[snappedPoints.length - 1]?.location;
        let drift = null;
        let rejectedByRouteGuard = false;
        if (lastSnapped) {
          drift = haversineMeters(
            lastRaw.latitude,
            lastRaw.longitude,
            lastSnapped.latitude,
            lastSnapped.longitude,
          );
          if (routeLine) {
            const onRoute = snapToRouteLine({
              lat: lastSnapped.latitude,
              lng: lastSnapped.longitude,
              routeLine,
              maxSnapDistanceM: maxRouteOffsetM,
            });
            if (!onRoute.snapped) {
              rejectedByRouteGuard = true;
            }
          }
        }

        setState({
          enabled: true,
          fallbackReason: null,
          driftMetres: drift,
          pointsChecked: sample.length,
          lastCheckedAt: Date.now(),
          quota: quota ?? null,
          rejectedByRouteGuard,
        });
      } finally {
        inflightRef.current = false;
        // Reset buffer to last point so subsequent batches overlap by 1.
        const tail = bufferRef.current[bufferRef.current.length - 1];
        bufferRef.current = tail ? [tail] : [];
        lastCheckedAtRef.current = Date.now();
      }
    };

    const id = window.setInterval(flush, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [featureEnabled, intervalMs, routeLine, maxRouteOffsetM]);

  // Reset when feature toggles off.
  useEffect(() => {
    if (featureEnabled) return;
    bufferRef.current = [];
    inflightRef.current = false;
    lastCheckedAtRef.current = 0;
    setState({
      enabled: false,
      fallbackReason: null,
      driftMetres: null,
      pointsChecked: 0,
      lastCheckedAt: null,
      quota: null,
      rejectedByRouteGuard: false,
    });
  }, [featureEnabled]);

  return state;
}
