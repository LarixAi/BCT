import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { getDistanceMeters } from "@/utils/navigationUtils";
import {
  clearExternalNavSession,
  loadExternalNavSession,
} from "@/lib/navigation/externalNavSession";
import {
  bringDriverAppToForeground,
  showArrivalReturnToast,
} from "@/lib/navigation/returnToDriverApp";

/** Slightly wider than in-app arrive — GPS while Maps is foreground can be noisier. */
const EXTERNAL_ARRIVAL_METERS = 70;
const REQUIRED_NEAR_READINGS = 2;

function isNearDestination(position, destination) {
  if (!position || !destination) return false;
  const distance = getDistanceMeters(
    { latitude: position.coords.latitude, longitude: position.coords.longitude },
    { latitude: destination.latitude, longitude: destination.longitude },
  );
  if (distance == null || distance > EXTERNAL_ARRIVAL_METERS) return false;
  const accuracy = position.coords.accuracy;
  if (accuracy != null && accuracy > 80) return false;
  return true;
}

/**
 * While Google Maps is open, Veyvio stays in the background and watches GPS.
 * When the driver reaches the pickup, bring them back to the driver app.
 */
export function useExternalNavReturn({ enabled = true } = {}) {
  const navigate = useNavigate();
  const watchIdRef = useRef(null);
  const nearCountRef = useRef(0);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return undefined;

    let cancelled = false;

    async function handleArrival(session) {
      if (handledRef.current || cancelled) return;
      handledRef.current = true;

      clearExternalNavSession();
      if (watchIdRef.current != null) {
        void Geolocation.clearWatch({ id: watchIdRef.current }).catch(() => {});
        watchIdRef.current = null;
      }

      await bringDriverAppToForeground();
      showArrivalReturnToast(session.destination?.label);

      if (session.jobRoute) {
        navigate(session.jobRoute, { replace: false });
      }
    }

    async function evaluatePosition(position) {
      const session = loadExternalNavSession();
      if (!session || handledRef.current) return;

      if (isNearDestination(position, session.destination)) {
        nearCountRef.current += 1;
        if (nearCountRef.current >= REQUIRED_NEAR_READINGS) {
          await handleArrival(session);
        }
      } else {
        nearCountRef.current = 0;
      }
    }

    async function startWatch() {
      const session = loadExternalNavSession();
      if (!session || cancelled) return;

      handledRef.current = false;
      nearCountRef.current = 0;

      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") {
          await Geolocation.requestPermissions();
        }
      } catch {
        /* continue — may still work with prior grant */
      }

      watchIdRef.current = await Geolocation.watchPosition(
        (position, err) => {
          if (err || cancelled) return;
          void evaluatePosition(position);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        },
      );
    }

    void startWatch();

    const resumeListener = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive || cancelled) return;
      const session = loadExternalNavSession();
      if (!session) return;

      void Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
        .then((position) => evaluatePosition(position))
        .catch(() => {});
    });

    return () => {
      cancelled = true;
      if (watchIdRef.current != null) {
        void Geolocation.clearWatch({ id: watchIdRef.current }).catch(() => {});
        watchIdRef.current = null;
      }
      void resumeListener.then((l) => l.remove());
    };
  }, [enabled, navigate]);
}
