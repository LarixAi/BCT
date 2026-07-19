import { useEffect, useRef, useState } from "react";
import { useDeviceCompassHeading } from "@/hooks/useDeviceCompassHeading";

/**
 * Heading (degrees clockwise from north) fused from GPS course and the device
 * magnetic compass, smoothed with a circular EMA so the map camera doesn't
 * snap to GPS spikes.
 *
 *  - When the phone is moving (>= ~6 mph, GPS_TRUST_SPEED_MPS), GPS course is
 *    the most reliable signal — it tracks the actual direction of travel.
 *  - When stationary or crawling (red lights, slow traffic, parking), GPS
 *    heading is unreliable or unavailable; we use the magnetic compass so the
 *    map keeps pointing the way the vehicle is facing.
 *  - The smoothing handles the 0°/360° wrap correctly (shortest angular path)
 *    and runs on requestAnimationFrame so the map bearing animates smoothly
 *    rather than snapping every camera tick.
 */

const GPS_TRUST_SPEED_MPS = 3; // ~6.7 mph
const SMOOTH_FACTOR = 0.18;
const MIN_DELTA_DEG = 0.5;

function shortestAngleDelta(target, current) {
  return ((target - current + 540) % 360) - 180;
}

export function useFusedHeading({ gpsHeading, gpsSpeed, enabled = true }) {
  const compass = useDeviceCompassHeading({ enabled });
  const compassRef = useRef(null);
  const gpsRef = useRef({ heading: null, speed: null });
  const smoothedRef = useRef(null);
  const [smoothed, setSmoothed] = useState(null);

  // Mirror inputs into refs so the rAF loop always reads the latest values.
  compassRef.current = compass;
  gpsRef.current.heading = gpsHeading;
  gpsRef.current.speed = gpsSpeed;

  useEffect(() => {
    if (!enabled) {
      smoothedRef.current = null;
      setSmoothed(null);
      return undefined;
    }

    let raf = 0;

    const tick = () => {
      const { heading: gh, speed } = gpsRef.current;
      const validGps =
        Number.isFinite(gh) &&
        gh >= 0 &&
        Number.isFinite(speed) &&
        speed >= GPS_TRUST_SPEED_MPS;

      const target = validGps
        ? gh
        : Number.isFinite(compassRef.current)
          ? compassRef.current
          : null;

      if (target == null) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const current = smoothedRef.current;
      const next =
        current == null
          ? target
          : (current + shortestAngleDelta(target, current) * SMOOTH_FACTOR + 360) % 360;

      const delta = current == null ? Infinity : Math.abs(shortestAngleDelta(next, current));

      if (delta > MIN_DELTA_DEG) {
        smoothedRef.current = next;
        setSmoothed(next);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return smoothed;
}
