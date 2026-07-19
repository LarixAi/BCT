import { DEFAULT_MAP_LAT, DEFAULT_MAP_LNG } from "@/hooks/useDriverMapPosition";

function readCoord(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Extract lat/lng from a location json blob or stop row. */
export function coordsFromLocation(json, stopRow) {
  const lat =
    readCoord(stopRow?.latitude) ??
    readCoord(json?.latitude) ??
    readCoord(json?.lat);
  const lng =
    readCoord(stopRow?.longitude) ??
    readCoord(json?.longitude) ??
    readCoord(json?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function locationLabel(json, fallback = "—") {
  if (!json || typeof json !== "object") return fallback;
  return json.label || json.address || json.name || json.postcode || fallback;
}

/** Spread stops without coords around London center so the map still shows a route hint. */
export function fallbackStopCoords(stopOrder, total) {
  const angle = ((stopOrder - 1) / Math.max(total, 1)) * Math.PI * 2;
  const radius = 0.012 + stopOrder * 0.004;
  return {
    lat: DEFAULT_MAP_LAT + Math.sin(angle) * radius,
    lng: DEFAULT_MAP_LNG + Math.cos(angle) * radius * 1.4,
    approximate: true,
  };
}

export function normalizeHubStop(row, index, total, pickupJson, dropoffJson) {
  const json = row.stop_type === "pickup" ? pickupJson : dropoffJson;
  const coords = coordsFromLocation(json, row) ?? fallbackStopCoords(row.stop_order ?? index + 1, total);
  return {
    id: row.id,
    label: row.label ?? locationLabel(json),
    address: row.address ?? locationLabel(json),
    sequence: row.stop_order ?? index + 1,
    stopType: row.stop_type ?? "stop",
    status: row.status ?? "planned",
    arrivalTime: row.planned_time,
    lat: coords.lat,
    lng: coords.lng,
    approximate: Boolean(coords.approximate),
  };
}
