import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { getDriverRoute } from "@/services/driverRouteService";
import {
  formatDistance,
  formatDuration,
  getDistanceMeters,
  getNearestStepIndex,
  stopToDestination,
} from "@/utils/navigationUtils";
import {
  buildFallbackInstruction,
  computeCanArrive,
  REROUTE_INTERVAL_MS,
} from "@/lib/navigation/routeUtils";
import { logNavigationTelemetry } from "@/lib/navigation/navigationTelemetry";
import { DRIVER_STOP_ITINERARY_CHANGED } from "@/services/job-stop-changes.service";
import {
  buildDistanceAheadPrompt,
  primeNavigationVoice,
  speakNavigationInstruction,
  stopNavigationVoice,
} from "@/lib/navigation/navigationVoice";
import { useNavigationLocationEngine } from "@/lib/navigation/locationEngine/useNavigationLocationEngine";
import { useGoogleRoadsCorrection } from "@/lib/navigation/locationEngine/useGoogleRoadsCorrection";

export function useJobTurnByTurnNavigation({
  enabled = false,
  destinationStop = null,
  voiceEnabled = true,
  job = null,
  driver = null,
}) {
  const [permissionStatus, setPermissionStatus] = useState("checking");
  const [rawFix, setRawFix] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const watcherRef = useRef(null);
  const lastInstructionRef = useRef("");
  const lastSpokenStepIndexRef = useRef(-1);
  const lastRouteFetchRef = useRef(0);
  const destinationKeyRef = useRef("");
  const routeLoggedRef = useRef(false);
  const spokenThresholdsRef = useRef({});
  const arrivalSpokenRef = useRef(false);
  const voicePrimedRef = useRef(false);

  const destination = useMemo(() => stopToDestination(destinationStop), [destinationStop]);

  const destinationLatLng = useMemo(() => {
    if (!destination?.latitude || !destination?.longitude) return null;
    return { latitude: destination.latitude, longitude: destination.longitude };
  }, [destination]);

  const destinationLabel = destination?.label ?? "next stop";

  const {
    displayLocation,
    filteredLocation,
    offRoute,
    alongRouteM,
    snapped,
    staleAgeMs,
    routeLine,
    getEngineSnapshot,
  } = useNavigationLocationEngine({
    rawFix,
    routePositions: route?.leafletPositions,
    enabled,
  });

  // Phase 4 — periodic Google Roads (Snap-to-Roads) drift check.
  // Default-OFF unless `VITE_NAV_USE_GOOGLE_ROADS=true`. The engine still
  // owns the displayed marker — this hook only reports drift for now.
  const roadsCorrection = useGoogleRoadsCorrection({
    filteredLocation,
    routeLine,
    enabled,
  });

  const fetchRoute = useCallback(
    async (origin, { reason = "initial" } = {}) => {
      if (!origin || !destinationLatLng) return;

      setRouteLoading(true);
      setRouteError(null);

      try {
        const nextRoute = await getDriverRoute({
          origin: {
            latitude: origin.latitude ?? origin.lat,
            longitude: origin.longitude ?? origin.lng,
          },
          destination: destinationLatLng,
        });

        setRoute(nextRoute);
        setCurrentStepIndex(0);
        lastRouteFetchRef.current = Date.now();
        routeLoggedRef.current = false;

        if (job?.id && (reason === "refresh" || reason === "off_route")) {
          void logNavigationTelemetry({
            driver,
            job,
            action: reason === "off_route" ? "navigation_rerouted" : "navigation_route_refreshed",
            metadata: { route_source: nextRoute?.source ?? null, reason },
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Route failed";
        setRouteError(message);
        void logNavigationTelemetry({
          driver,
          job,
          action: reason === "refresh" ? "navigation_route_refresh_failed" : "route_failed",
          metadata: { error: message, reason },
        });
      } finally {
        setRouteLoading(false);
      }
    },
    [destinationLatLng, driver, job],
  );

  useEffect(() => {
    if (!enabled) {
      setPermissionStatus("idle");
      setRoute(null);
      routeLoggedRef.current = false;
      return undefined;
    }

    let mounted = true;

    async function startLocationTracking() {
      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.requestPermissions();
          if (!mounted) return;
          if (perm.location !== "granted") {
            setPermissionStatus("denied");
            setRouteError("Location permission is required for navigation.");
            return;
          }
          setPermissionStatus("granted");

          watcherRef.current = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 12000 },
            (position, err) => {
              if (err || !position) return;
              setRawFix({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                heading: position.coords.heading,
                speed: position.coords.speed,
                accuracy: position.coords.accuracy,
                timestampMs: position.timestamp ?? Date.now(),
              });
            },
          );
          return;
        }

        if (!navigator.geolocation) {
          setPermissionStatus("unavailable");
          setRouteError("GPS is not available on this device.");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          () => setPermissionStatus("granted"),
          (err) => setPermissionStatus(err.code === 1 ? "denied" : "unavailable"),
          { enableHighAccuracy: true, timeout: 12000 },
        );

        watcherRef.current = navigator.geolocation.watchPosition(
          (position) => {
            setRawFix({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
              accuracy: position.coords.accuracy,
              timestampMs: position.timestamp ?? Date.now(),
            });
          },
          (err) => {
            if (err.code === 1) setPermissionStatus("denied");
          },
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
        );
      } catch {
        if (mounted) setPermissionStatus("unavailable");
      }
    }

    void startLocationTracking();

    return () => {
      mounted = false;
      stopNavigationVoice();

      if (Capacitor.isNativePlatform() && watcherRef.current != null) {
        void Geolocation.clearWatch({ id: watcherRef.current });
      } else if (watcherRef.current != null) {
        navigator.geolocation.clearWatch(watcherRef.current);
      }
      watcherRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const key = destinationStop?.id ?? "";
    if (key !== destinationKeyRef.current) {
      destinationKeyRef.current = key;
      setRoute(null);
      lastRouteFetchRef.current = 0;
      routeLoggedRef.current = false;
      spokenThresholdsRef.current = {};
      arrivalSpokenRef.current = false;
      lastInstructionRef.current = "";
      // Phase 5 — cancel any in-flight TTS so we don't keep narrating
      // instructions for the stop the driver just left behind.
      void stopNavigationVoice();
    }
  }, [destinationStop?.id]);

  // Phase 5 — when the route polyline itself swaps (reroute or refresh),
  // also drop any queued voice prompts so the new step's first prompt is
  // the next thing the driver hears.
  useEffect(() => {
    if (!enabled) return;
    spokenThresholdsRef.current = {};
    arrivalSpokenRef.current = false;
    lastInstructionRef.current = "";
    lastSpokenStepIndexRef.current = -1;
    void stopNavigationVoice();
  }, [route?.distanceMeters, route?.duration, enabled]);

  useEffect(() => {
    if (!enabled || !job?.id) return undefined;
    const onItineraryChanged = (event) => {
      if (event.detail?.jobId !== job.id) return;
      setRoute(null);
      lastRouteFetchRef.current = 0;
      routeLoggedRef.current = false;
    };
    window.addEventListener(DRIVER_STOP_ITINERARY_CHANGED, onItineraryChanged);
    return () => window.removeEventListener(DRIVER_STOP_ITINERARY_CHANGED, onItineraryChanged);
  }, [enabled, job?.id]);

  // Initial route fetch + step index advance + reroute trigger.
  useEffect(() => {
    if (!enabled || !destinationLatLng) return;

    const probe = filteredLocation ?? rawFix;
    if (!probe) return;

    const probeLatLng = {
      latitude: probe.latitude ?? probe.lat,
      longitude: probe.longitude ?? probe.lng,
    };

    if (!route) {
      void fetchRoute(probeLatLng);
      return;
    }

    const nearestStepIndex = getNearestStepIndex(probeLatLng, route.steps);
    if (nearestStepIndex !== currentStepIndex) {
      setCurrentStepIndex(nearestStepIndex);
    }

    // Reroute when the location engine has confirmed off-route via hysteresis.
    // Safety upper bound: REROUTE_INTERVAL_MS since last fetch.
    if (offRoute?.shouldReroute) {
      const sinceFetch = Date.now() - lastRouteFetchRef.current;
      if (sinceFetch > 5000) {
        void fetchRoute(probeLatLng, { reason: "off_route" });
      }
    } else if (
      offRoute?.isOff &&
      Date.now() - lastRouteFetchRef.current > REROUTE_INTERVAL_MS
    ) {
      void fetchRoute(probeLatLng, { reason: "off_route" });
    }
  }, [
    enabled,
    filteredLocation,
    rawFix,
    destinationLatLng,
    route,
    fetchRoute,
    offRoute?.shouldReroute,
    offRoute?.isOff,
    currentStepIndex,
  ]);

  useEffect(() => {
    if (!enabled || !route || routeLoggedRef.current || !job?.id) return;
    routeLoggedRef.current = true;
    void logNavigationTelemetry({
      driver,
      job,
      action: "route_loaded",
      metadata: {
        route_source: route.source ?? null,
        distance_meters: route.distanceMeters ?? null,
      },
    });
  }, [enabled, route, job, driver]);

  const navigationStartedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      navigationStartedRef.current = false;
      return;
    }
    if (navigationStartedRef.current || !job?.id) return;
    navigationStartedRef.current = true;
    void logNavigationTelemetry({ driver, job, action: "navigation_started" });
  }, [enabled, job?.id, driver]);

  // Phase-0 baseline telemetry: emit a periodic engine snapshot so we can
  // graph snap rate, off-route distance, accuracy and reject ratio against
  // the success criteria in docs/NAVIGATION_PLAN.md.
  useEffect(() => {
    if (!enabled || !job?.id || !route) return undefined;
    const SNAPSHOT_INTERVAL_MS = 30_000;
    const id = window.setInterval(() => {
      const snap = getEngineSnapshot?.();
      if (!snap || snap.fixCount === 0) return;
      void logNavigationTelemetry({
        driver,
        job,
        action: "navigation_engine_snapshot",
        metadata: {
          route_source: route.source ?? null,
          fix_count: snap.fixCount,
          reject_count: snap.rejectCount,
          last_fix_age_ms: snap.lastFixAgeMs,
          snapped: snap.snapped,
          off_route_strikes: snap.offRouteStrikes,
          off_route_distance_m:
            snap.offRouteDistanceM != null ? Math.round(snap.offRouteDistanceM) : null,
          along_route_m:
            snap.alongRouteM != null ? Math.round(snap.alongRouteM) : null,
        },
      });
    }, SNAPSHOT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, job, driver, route, getEngineSnapshot]);

  const currentStep = route?.steps?.[currentStepIndex] ?? null;

  const instruction =
    currentStep?.navigationInstruction?.instructions ||
    buildFallbackInstruction({
      routeSteps: route?.steps,
      destinationLabel,
    });

  const maneuver = currentStep?.navigationInstruction?.maneuver || "STRAIGHT";

  // For the marker / camera we use the snapped + dead-reckoned engine output.
  const driverLocation = useMemo(() => {
    if (displayLocation) return displayLocation;
    if (filteredLocation) return filteredLocation;
    if (!rawFix) return null;
    return {
      latitude: rawFix.latitude,
      longitude: rawFix.longitude,
      heading: rawFix.heading,
      speed: rawFix.speed,
      accuracy: rawFix.accuracy,
    };
  }, [displayLocation, filteredLocation, rawFix]);

  const distanceToDestination = useMemo(() => {
    if (!driverLocation || !destinationLatLng) return null;
    return getDistanceMeters(driverLocation, destinationLatLng);
  }, [driverLocation, destinationLatLng]);

  const canArrive = useMemo(
    () =>
      computeCanArrive({
        distanceMeters: distanceToDestination,
        speed: driverLocation?.speed,
        accuracy: driverLocation?.accuracy,
      }),
    [distanceToDestination, driverLocation?.speed, driverLocation?.accuracy],
  );

  const distanceToStepEnd = useMemo(() => {
    const end = currentStep?.endLocation?.latLng;
    if (!filteredLocation || !end) return null;
    return getDistanceMeters(filteredLocation, {
      latitude: end.latitude,
      longitude: end.longitude,
    });
  }, [filteredLocation, currentStep]);

  useEffect(() => {
    if (!enabled || !voiceEnabled) {
      voicePrimedRef.current = false;
      return;
    }
    if (voicePrimedRef.current) return;
    voicePrimedRef.current = true;
    void primeNavigationVoice();
  }, [enabled, voiceEnabled]);

  // Phase 6 — speak the maneuver only when the **step** advances, not on
  // every re-render where the instruction string happens to differ. Stops
  // the voice repeating the same turn after a state churn.
  useEffect(() => {
    if (!enabled || !voiceEnabled || !instruction) return;
    if (lastSpokenStepIndexRef.current === currentStepIndex) return;
    lastSpokenStepIndexRef.current = currentStepIndex;
    lastInstructionRef.current = instruction;
    void speakNavigationInstruction(instruction);
  }, [enabled, voiceEnabled, instruction, currentStepIndex]);

  useEffect(() => {
    if (!enabled || !voiceEnabled || !instruction || distanceToStepEnd == null) return;
    const prompt = buildDistanceAheadPrompt({
      distanceMetres: distanceToStepEnd,
      instruction,
      stepIndex: currentStepIndex,
      spokenThresholdsRef,
      // Phase 6 — speed-aware prompt timing (10 s lookahead at speed).
      speedMps: filteredLocation?.speed ?? driverLocation?.speed ?? null,
    });
    if (prompt) void speakNavigationInstruction(prompt);
  }, [
    enabled,
    voiceEnabled,
    instruction,
    distanceToStepEnd,
    currentStepIndex,
    filteredLocation?.speed,
    driverLocation?.speed,
  ]);

  useEffect(() => {
    if (!enabled || !voiceEnabled || !canArrive || arrivalSpokenRef.current) return;
    arrivalSpokenRef.current = true;
    const label = destinationLabel ?? "your stop";
    void speakNavigationInstruction(`You have arrived at ${label}`);
  }, [enabled, voiceEnabled, canArrive, destinationLabel]);

  const routeCoordinates = route?.leafletPositions ?? [];

  return {
    permissionStatus,
    driverLocation,
    rawLocation: rawFix
      ? {
          latitude: rawFix.latitude,
          longitude: rawFix.longitude,
          heading: rawFix.heading,
          speed: rawFix.speed,
          accuracy: rawFix.accuracy,
        }
      : null,
    filteredLocation,
    destination,
    destinationLatLng,
    route,
    routeLoading,
    routeError,
    routeSource: route?.source ?? null,
    currentStep,
    currentStepIndex,
    instruction,
    maneuver,
    hasArrived: canArrive,
    canArrive,
    distanceToDestination,
    formattedDistanceToDestination: formatDistance(distanceToDestination),
    formattedDuration: formatDuration(route?.duration),
    distanceText: formatDistance(distanceToDestination),
    durationText: formatDuration(route?.duration),
    routeCoordinates,
    leafletPositions: routeCoordinates,
    offRoute,
    alongRouteM,
    snapped,
    staleAgeMs,
    roadsCorrection,
    getEngineSnapshot,
    refreshRoute: () => {
      const probe = filteredLocation ?? rawFix;
      if (!probe) return;
      void fetchRoute(
        {
          latitude: probe.latitude ?? probe.lat,
          longitude: probe.longitude ?? probe.lng,
        },
        { reason: "refresh" },
      );
    },
  };
}
