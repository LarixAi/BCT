/**
 * Fetch a driving route that follows real roads (OSRM public API).
 * With steps=true for turn-by-turn street names (free, no traffic).
 */

const OSRM_MANEUVER_MAP = {
  turn: "TURN_RIGHT",
  "turn left": "TURN_LEFT",
  "turn right": "TURN_RIGHT",
  "sharp left": "TURN_SHARP_LEFT",
  "sharp right": "TURN_SHARP_RIGHT",
  "slight left": "TURN_SLIGHT_LEFT",
  "slight right": "TURN_SLIGHT_RIGHT",
  straight: "STRAIGHT",
  depart: "DEPART",
  arrive: "STRAIGHT",
  roundabout: "ROUNDABOUT_RIGHT",
  "roundabout turn": "ROUNDABOUT_RIGHT",
  "exit roundabout": "ROUNDABOUT_RIGHT",
  merge: "MERGE",
  "ramp-left": "RAMP_LEFT",
  "ramp-right": "RAMP_RIGHT",
  uturn: "UTURN_LEFT",
};

function mapOsrmManeuver(modifier, type) {
  const key = [type, modifier].filter(Boolean).join(" ").trim().toLowerCase();
  if (OSRM_MANEUVER_MAP[key]) return OSRM_MANEUVER_MAP[key];
  if (modifier && OSRM_MANEUVER_MAP[modifier.toLowerCase()]) {
    return OSRM_MANEUVER_MAP[modifier.toLowerCase()];
  }
  if (type && OSRM_MANEUVER_MAP[type.toLowerCase()]) return OSRM_MANEUVER_MAP[type.toLowerCase()];
  return "STRAIGHT";
}

function osrmStepsToNavigationSteps(legs) {
  const steps = [];
  for (const leg of legs ?? []) {
    for (const step of leg.steps ?? []) {
      const name = step.name?.trim();
      const modifier = step.maneuver?.modifier;
      const type = step.maneuver?.type;
      let instructions = name ? `Continue on ${name}` : "Continue";
      if (type === "turn" && modifier && name) {
        instructions = `${modifier.charAt(0).toUpperCase()}${modifier.slice(1)} onto ${name}`;
      } else if (type === "depart" && name) {
        instructions = `Head toward ${name}`;
      } else if (type === "arrive") {
        instructions = "Arrive at destination";
      }

      steps.push({
        distanceMeters: step.distance,
        endLocation: step.maneuver?.location
          ? {
              latLng: {
                latitude: step.maneuver.location[1],
                longitude: step.maneuver.location[0],
              },
            }
          : undefined,
        navigationInstruction: {
          instructions,
          maneuver: mapOsrmManeuver(modifier, type),
        },
      });
    }
  }
  return steps;
}

async function requestRoute(fromLat, fromLng, toLat, toLng, { withSteps = false } = {}) {
  const stepsParam = withSteps ? "&steps=true" : "";
  const url =
    `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}` +
    `?overview=full&geometries=geojson${stepsParam}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Route request failed (${res.status})`);

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) {
    throw new Error("No route found");
  }

  return data.routes[0];
}

/** Returns route polyline plus real road distance and duration from OSRM. */
export async function fetchRoadRouteWithMeta(fromLat, fromLng, toLat, toLng, options = {}) {
  const route = await requestRoute(fromLat, fromLng, toLat, toLng, options);
  return {
    positions: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMi: route.distance / 1609.344,
    durationSec: Math.round(route.duration),
    steps: options.withSteps ? osrmStepsToNavigationSteps(route.legs) : [],
  };
}

/** Returns Leaflet positions as [lat, lng][]. */
export async function fetchRoadRoute(fromLat, fromLng, toLat, toLng) {
  const { positions } = await fetchRoadRouteWithMeta(fromLat, fromLng, toLat, toLng);
  return positions;
}
