import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchRoadRouteWithMeta } from "@/lib/fetchRoadRoute";
import { isDriverNavTestMode } from "@/lib/driverNavConfig";
import {
  coordinatesFromRouteSteps,
  decodePolyline,
  toLeafletPositions,
} from "@/utils/navigationUtils";

function normalizeGoogleRoute(data) {
  const route = data?.routes?.[0];
  if (!route) throw new Error("No route found");

  const encodedPolyline = route?.polyline?.encodedPolyline;
  const steps = route?.legs?.flatMap((leg) => leg.steps ?? []) ?? [];
  let coordinates = decodePolyline(encodedPolyline);
  if (coordinates.length < 2) {
    coordinates = coordinatesFromRouteSteps(steps);
  }

  return {
    source: "google",
    distanceMeters: route.distanceMeters || 0,
    duration: route.duration || "",
    coordinates,
    leafletPositions: toLeafletPositions(coordinates),
    steps,
    quota: data?.quota ?? null,
  };
}

async function fetchGoogleRoute({ origin, destination, waypoints = [], testMode = false }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("driver-route", {
    body: { origin, destination, waypoints, testMode },
  });

  if (error) throw new Error(error.message || "Failed to calculate route");

  if (data?.fallback) {
    throw new Error(data.reason || "google_fallback");
  }

  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Route failed");

  return normalizeGoogleRoute(data);
}

async function fetchOsrmRoute(origin, destination, { withSteps = true } = {}) {
  const { positions, distanceMi, durationSec, steps } = await fetchRoadRouteWithMeta(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
    { withSteps },
  );

  const coordinates = positions.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

  return {
    source: "osrm",
    distanceMeters: Math.round(distanceMi * 1609.344),
    duration: `${durationSec}s`,
    coordinates,
    leafletPositions: positions,
    steps:
      steps.length > 0
        ? steps
        : [
            {
              navigationInstruction: {
                instructions: "Follow the highlighted route",
                maneuver: "STRAIGHT",
              },
            },
          ],
    quota: null,
  };
}

export async function getDriverRoute({ origin, destination, waypoints = [] }) {
  if (!origin?.latitude || !destination?.latitude) {
    throw new Error("Missing route coordinates");
  }

  if (isDriverNavTestMode()) {
    return fetchOsrmRoute(origin, destination, { withSteps: true });
  }

  try {
    return await fetchGoogleRoute({ origin, destination, waypoints, testMode: false });
  } catch (googleError) {
    console.warn("[getDriverRoute] Google route unavailable, using OSRM:", googleError);
    return fetchOsrmRoute(origin, destination, { withSteps: true });
  }
}
