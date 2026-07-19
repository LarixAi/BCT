import { useEffect, useRef, useState } from "react";

/**
 * Magnetic compass heading in degrees (0=N, 90=E, 180=S, 270=W) sourced from
 * the phone's orientation sensors.
 *
 * Why we need this on top of GPS:
 * - `GeolocationPosition.coords.heading` is course-over-ground from GPS. It is
 *   `null` (or negative) when the device is stationary or moving very slowly,
 *   and is unreliable below ~6 mph. Google Maps / Waze fall back to the
 *   magnetic compass at low speeds so the camera/marker still points the right
 *   way at a junction or a red light.
 *
 * Sensor sources:
 * - iOS Safari/WKWebView: `event.webkitCompassHeading` (already true heading,
 *   degrees clockwise from north). Requires `requestPermission()` since iOS 13.
 * - Android Chrome: `deviceorientationabsolute` `event.alpha` (0..360 measured
 *   counter-clockwise from north). Compass heading = (360 - alpha) mod 360.
 * - Older browsers: fall back to `deviceorientation` `event.alpha` which may be
 *   relative; better than nothing for small-area orientation.
 */
export function useDeviceCompassHeading({ enabled = true } = {}) {
  const [heading, setHeading] = useState(null);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    let cancelled = false;
    let attachedEvent = null;

    function publish(value) {
      if (cancelled) return;
      const now = Date.now();
      // Throttle React state updates to ~30 Hz so we don't thrash renders.
      if (now - lastEmitRef.current < 33) return;
      lastEmitRef.current = now;
      setHeading(value);
    }

    function handle(event) {
      if (typeof event.webkitCompassHeading === "number" && Number.isFinite(event.webkitCompassHeading)) {
        publish(event.webkitCompassHeading);
        return;
      }
      if (typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
        // Most Android devices report `alpha` relative to magnetic north when
        // the event is `deviceorientationabsolute`. We assume the absolute
        // event listener is attached when available — see attach() below.
        const compass = (360 - event.alpha + 360) % 360;
        publish(compass);
      }
    }

    async function attach() {
      try {
        const Cls = window.DeviceOrientationEvent;
        if (Cls && typeof Cls.requestPermission === "function") {
          const result = await Cls.requestPermission();
          if (result !== "granted") return;
        }

        const eventName =
          "ondeviceorientationabsolute" in window
            ? "deviceorientationabsolute"
            : "deviceorientation";

        window.addEventListener(eventName, handle, { passive: true });
        attachedEvent = eventName;
      } catch {
        /* sensor unavailable — caller will fall back to GPS heading */
      }
    }

    void attach();

    return () => {
      cancelled = true;
      if (attachedEvent) window.removeEventListener(attachedEvent, handle);
    };
  }, [enabled]);

  return heading;
}
