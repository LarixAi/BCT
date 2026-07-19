/** Decode Google encoded polyline → [{ latitude, longitude }] */
export function decodePolyline(encoded) {
  if (!encoded) return [];

  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

/** Leaflet positions [lat, lng][] from decoded polyline points */
export function toLeafletPositions(points) {
  return (points ?? []).map((p) => [p.latitude, p.longitude]);
}

/** Build a coarse path from turn-by-turn step endpoints when polyline is missing. */
export function coordinatesFromRouteSteps(steps) {
  const points = [];
  for (const step of steps ?? []) {
    const end = step?.endLocation?.latLng;
    if (end?.latitude == null || end?.longitude == null) continue;
    const prev = points[points.length - 1];
    if (prev?.latitude === end.latitude && prev?.longitude === end.longitude) continue;
    points.push({ latitude: end.latitude, longitude: end.longitude });
  }
  return points;
}

export function getDistanceMeters(a, b) {
  if (!a || !b) return Number.MAX_SAFE_INTEGER;

  const latA = a.latitude ?? a.lat;
  const lngA = a.longitude ?? a.lng;
  const latB = b.latitude ?? b.lat;
  const lngB = b.longitude ?? b.lng;

  if (latA == null || lngA == null || latB == null || lngB == null) {
    return Number.MAX_SAFE_INTEGER;
  }

  const earthRadius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const lat1 = toRad(latA);
  const lat2 = toRad(latB);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(duration) {
  if (!duration) return "";
  const match = String(duration).match(/(\d+)s/);
  if (!match) return "";
  const sec = Number(match[1]);
  if (sec < 60) return `${sec} min`;
  return `${Math.round(sec / 60)} min`;
}

export function getNearestStepIndex(currentLocation, steps) {
  if (!currentLocation || !steps?.length) return 0;

  let nearestIndex = 0;
  let nearestDistance = Number.MAX_SAFE_INTEGER;

  steps.forEach((step, index) => {
    const endLatLng = step?.endLocation?.latLng;
    if (!endLatLng) return;

    const distance = getDistanceMeters(currentLocation, {
      latitude: endLatLng.latitude,
      longitude: endLatLng.longitude,
    });

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

/** Lucide icon name for maneuver badges */
export function getManeuverIcon(maneuver) {
  switch (maneuver) {
    case "TURN_LEFT":
    case "TURN_SLIGHT_LEFT":
    case "TURN_SHARP_LEFT":
      return "ArrowLeft";

    case "TURN_RIGHT":
    case "TURN_SLIGHT_RIGHT":
    case "TURN_SHARP_RIGHT":
      return "ArrowRight";

    case "UTURN_LEFT":
    case "UTURN_RIGHT":
      return "Undo2";

    case "ROUNDABOUT_LEFT":
    case "ROUNDABOUT_RIGHT":
      return "RefreshCw";

    case "MERGE":
      return "GitMerge";

    case "RAMP_LEFT":
    case "RAMP_RIGHT":
      return "TrendingUp";

    case "STRAIGHT":
    case "DEPART":
    default:
      return "ArrowUp";
  }
}

export function stopToDestination(stop) {
  if (!stop || stop.lat == null || stop.lng == null) return null;
  return {
    type: stop.stopType ?? "stop",
    label: stop.label ?? "Stop",
    address: stop.address,
    latitude: stop.lat,
    longitude: stop.lng,
  };
}
