/**
 * Driver navigation location engine.
 *
 * Pipeline (matches the research report):
 *
 *   raw GPS fix
 *      → spike reject (smoothGps.isGpsReadingStable)
 *      → Kalman filter on lat/lng
 *      → snap-to-route (Turf nearestPointOnLine, route polyline only)
 *      → off-route detector with hysteresis
 *      → dead reckoning between fixes (rAF, capped at 3 s projection)
 *      → published `displayLocation` at ~8 Hz for marker + camera
 *
 * Outputs:
 *   - `displayLocation`  — what the marker / camera consume (snapped + projected)
 *   - `filteredLocation` — Kalman output (used for off-route checks, step index)
 *   - `offRoute`         — { isOff, strikes, shouldReroute, distanceM }
 *   - `alongRouteM`      — distance along the active route polyline
 *
 * The hook does NOT own the GPS watcher — the calling hook
 * (useJobTurnByTurnNavigation) feeds raw fixes via the `rawFix` prop. This keeps
 * permission / lifecycle handling in one place.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createKalmanFilter } from "@/lib/navigation/locationEngine/kalmanLatLng";
import {
  buildRouteLine,
  snapToRouteLine,
} from "@/lib/navigation/locationEngine/snapToRoute";
import { createOffRouteDetector } from "@/lib/navigation/locationEngine/offRouteDetector";
import { isGpsReadingStable } from "@/lib/smoothGps";
import { projectPosition, lerpLatLng } from "@/lib/navigation/deadReckoning";

const PUBLISH_INTERVAL_MS = 120;
const KALMAN_PROCESS_NOISE_MPS = 6;

function makeRouteSignature(positions) {
  if (!Array.isArray(positions) || positions.length < 2) return null;
  const first = positions[0];
  const last = positions[positions.length - 1];
  if (!first || !last) return null;
  return `${first[0].toFixed(5)},${first[1].toFixed(5)}|${last[0].toFixed(5)},${last[1].toFixed(5)}|${positions.length}`;
}

export function useNavigationLocationEngine({
  rawFix,
  routePositions,
  enabled = true,
  maxSnapDistanceM = 30,
}) {
  const filterRef = useRef(null);
  const offRouteRef = useRef(null);
  const lastFixRef = useRef(null);
  const displayRef = useRef(null);
  const lastRawAcceptedRef = useRef({ lat: null, lng: null, at: 0 });
  const fixCountRef = useRef(0);
  const rejectCountRef = useRef(0);
  const lastFixAgeMsRef = useRef(0);

  const [displayLocation, setDisplayLocation] = useState(null);
  const [filteredLocation, setFilteredLocation] = useState(null);
  const [offRouteState, setOffRouteState] = useState({
    isOff: false,
    strikes: 0,
    shouldReroute: false,
    distanceM: null,
  });
  const [alongRouteM, setAlongRouteM] = useState(null);
  const [snappedFlag, setSnappedFlag] = useState(false);
  const [staleAgeMs, setStaleAgeMs] = useState(0);

  if (!filterRef.current) {
    filterRef.current = createKalmanFilter({ processNoiseMps: KALMAN_PROCESS_NOISE_MPS });
  }
  if (!offRouteRef.current) {
    offRouteRef.current = createOffRouteDetector();
  }

  const routeLine = useMemo(() => buildRouteLine(routePositions), [routePositions]);
  const routeSignature = useMemo(() => makeRouteSignature(routePositions), [routePositions]);

  // Reset everything when navigation toggles off.
  useEffect(() => {
    if (enabled) return;
    filterRef.current?.reset();
    offRouteRef.current?.reset();
    lastFixRef.current = null;
    displayRef.current = null;
    lastRawAcceptedRef.current = { lat: null, lng: null, at: 0 };
    fixCountRef.current = 0;
    rejectCountRef.current = 0;
    lastFixAgeMsRef.current = 0;
    setDisplayLocation(null);
    setFilteredLocation(null);
    setOffRouteState({ isOff: false, strikes: 0, shouldReroute: false, distanceM: null });
    setAlongRouteM(null);
    setSnappedFlag(false);
    setStaleAgeMs(0);
  }, [enabled]);

  // Reset off-route detector whenever the route swaps (new polyline).
  useEffect(() => {
    offRouteRef.current?.reset();
  }, [routeSignature]);

  // Ingest each rawFix from the parent hook.
  useEffect(() => {
    if (!enabled || !rawFix) return;
    const lat = rawFix.latitude ?? rawFix.lat;
    const lng = rawFix.longitude ?? rawFix.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const now = rawFix.timestampMs ?? rawFix.timestamp ?? Date.now();
    const accuracy = rawFix.accuracy;
    const speed = Number.isFinite(rawFix.speed) ? rawFix.speed : null;
    const heading = Number.isFinite(rawFix.heading) ? rawFix.heading : null;

    // Spike rejection — drop wild jumps and overly inaccurate fixes.
    const last = lastRawAcceptedRef.current;
    if (last.at) {
      const stable = isGpsReadingStable({
        lat,
        lng,
        accuracy,
        prevLat: last.lat,
        prevLng: last.lng,
        prevAt: last.at,
        // Slightly more permissive than the home-screen smoother:
        // a moving driver legitimately covers more ground per second.
        maxAccuracyM: 100,
        maxJumpM: 200,
        minIntervalMs: 250,
      });
      if (!stable) {
        rejectCountRef.current += 1;
        return;
      }
    }

    lastRawAcceptedRef.current = { lat, lng, at: now };
    fixCountRef.current += 1;

    // Kalman.
    const filtered = filterRef.current.update(lat, lng, accuracy, now);
    if (!filtered) return;

    // Snap (only if route line available).
    let snap = {
      snappedLat: filtered.lat,
      snappedLng: filtered.lng,
      distanceM: null,
      alongM: null,
      snapped: false,
    };
    if (routeLine) {
      snap = snapToRouteLine({
        lat: filtered.lat,
        lng: filtered.lng,
        routeLine,
        maxSnapDistanceM,
      });
    }

    // Off-route — feeds the *raw* perpendicular distance regardless of snap.
    const off = routeLine
      ? offRouteRef.current.update(snap.distanceM, now)
      : { isOff: false, strikes: 0, shouldReroute: false, distanceM: null };

    const fix = {
      lat: snap.snapped ? snap.snappedLat : filtered.lat,
      lng: snap.snapped ? snap.snappedLng : filtered.lng,
      rawLat: filtered.lat,
      rawLng: filtered.lng,
      snapped: snap.snapped,
      distanceFromRouteM: snap.distanceM,
      alongRouteM: snap.alongM,
      heading,
      speed,
      accuracy,
      timestampMs: now,
    };

    lastFixRef.current = fix;

    setFilteredLocation({
      latitude: filtered.lat,
      longitude: filtered.lng,
      heading,
      speed,
      accuracy,
      timestampMs: now,
    });
    setOffRouteState(off);
    setAlongRouteM(snap.alongM);
    setSnappedFlag(snap.snapped);
  }, [rawFix, routeLine, enabled, maxSnapDistanceM]);

  // Dead-reckoning rAF loop — keeps the displayed marker/camera moving smoothly
  // between 1 Hz GPS fixes.
  useEffect(() => {
    if (!enabled) return undefined;
    let raf = 0;
    let lastPublishAt = 0;

    const tick = () => {
      const fix = lastFixRef.current;
      if (fix) {
        const now = Date.now();
        const ageMs = now - fix.timestampMs;
        lastFixAgeMsRef.current = ageMs;

        const projected = projectPosition(
          {
            lat: fix.lat,
            lng: fix.lng,
            heading: fix.heading,
            speed: fix.speed,
          },
          ageMs,
        );

        if (projected) {
          const eased = displayRef.current
            ? lerpLatLng(displayRef.current, projected, 0.22)
            : projected;
          displayRef.current = eased;

          if (now - lastPublishAt > PUBLISH_INTERVAL_MS) {
            lastPublishAt = now;
            setDisplayLocation({
              latitude: eased.lat,
              longitude: eased.lng,
              heading: fix.heading,
              speed: fix.speed,
              accuracy: fix.accuracy,
              snapped: fix.snapped,
              alongRouteM: fix.alongRouteM,
              timestampMs: fix.timestampMs,
              ageMs,
            });
            // Stale-fix indicator — used by marker UI to show a subtle pulse
            // once dead reckoning is no longer a fresh source of truth.
            setStaleAgeMs(ageMs);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return {
    displayLocation,
    filteredLocation,
    offRoute: offRouteState,
    alongRouteM,
    snapped: snappedFlag,
    staleAgeMs,
    routeLine,
    /**
     * Snapshot of engine internals for diagnostics and periodic telemetry.
     * Reads from refs so callers don't pay the cost of extra renders.
     */
    getEngineSnapshot() {
      return {
        fixCount: fixCountRef.current,
        rejectCount: rejectCountRef.current,
        lastFixAgeMs: lastFixAgeMsRef.current,
        snapped: snappedFlag,
        offRouteStrikes: offRouteState.strikes,
        offRouteDistanceM: offRouteState.distanceM,
        alongRouteM,
      };
    },
  };
}
