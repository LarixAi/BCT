import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { emaCoord, isGpsReadingStable } from "@/lib/smoothGps";

export const DEFAULT_MAP_LAT = 51.4774;
export const DEFAULT_MAP_LNG = -0.1278;

const DISPLAY_INTERVAL_MS = 1500;
const GEO_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 8000,
  timeout: 12000,
};

/**
 * Smoothed driver position for map display (not for compliance pings).
 * @returns {{ lat: number, lng: number, gpsStatus: 'ok' | 'pending' | 'denied' | 'unavailable' }}
 */
export function useDriverMapPosition(initialLat, initialLng) {
  const startLat = initialLat ?? DEFAULT_MAP_LAT;
  const startLng = initialLng ?? DEFAULT_MAP_LNG;

  const [lat, setLat] = useState(startLat);
  const [lng, setLng] = useState(startLng);
  const [gpsStatus, setGpsStatus] = useState("pending");

  const smoothRef = useRef({ lat: startLat, lng: startLng });
  const lastRawRef = useRef({ lat: startLat, lng: startLng, at: 0 });
  const lastDisplayRef = useRef(0);

  useEffect(() => {
    const publishDisplay = () => {
      const now = Date.now();
      if (now - lastDisplayRef.current < DISPLAY_INTERVAL_MS) return;
      lastDisplayRef.current = now;
      const s = smoothRef.current;
      setLat(s.lat);
      setLng(s.lng);
    };

    const onPosition = (rawLat, rawLng, accuracy = 20) => {
      const prev = lastRawRef.current;
      if (
        !isGpsReadingStable({
          lat: rawLat,
          lng: rawLng,
          accuracy,
          prevLat: prev.lat,
          prevLng: prev.lng,
          prevAt: prev.at,
        })
      ) {
        return;
      }

      lastRawRef.current = { lat: rawLat, lng: rawLng, at: Date.now() };

      smoothRef.current = {
        lat: emaCoord(smoothRef.current.lat, rawLat, 0.3),
        lng: emaCoord(smoothRef.current.lng, rawLng, 0.3),
      };

      setGpsStatus("ok");
      publishDisplay();
    };

    let watchId = null;
    let cancelled = false;

    async function startNativeWatch() {
      try {
        const perm = await Geolocation.requestPermissions();
        if (cancelled) return;
        if (perm.location !== "granted") {
          setGpsStatus("denied");
          return;
        }

        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 12000 },
          (position, err) => {
            if (err || !position) return;
            onPosition(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy ?? 20,
            );
          },
        );
      } catch {
        if (!cancelled) setGpsStatus("unavailable");
      }
    }

    if (Capacitor.isNativePlatform()) {
      void startNativeWatch();
    } else if (!navigator.geolocation) {
      setGpsStatus("unavailable");
    } else {
      watchId = navigator.geolocation.watchPosition(
        (pos) =>
          onPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        (err) => {
          if (err.code === 1) {
            setGpsStatus("denied");
          } else {
            setGpsStatus((s) => (s === "ok" ? "ok" : "unavailable"));
          }
        },
        GEO_OPTIONS,
      );
    }

    const flushTimer = setInterval(publishDisplay, DISPLAY_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (Capacitor.isNativePlatform() && watchId != null) {
        void Geolocation.clearWatch({ id: watchId });
      } else if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(flushTimer);
    };
  }, []);

  return { lat, lng, gpsStatus };
}
