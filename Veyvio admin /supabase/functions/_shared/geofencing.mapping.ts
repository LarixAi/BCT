/**
 * Pure geofence containment check — zero imports so this module is
 * importable from both Deno (command-api) and plain Node (unit tests),
 * matching the pattern in incident-workflow.mapping.ts /
 * vehicle-swap-workflow.mapping.ts. No PostGIS dependency: Veyvio's places
 * are simple circle geofences (see docs/architecture/14-navigation-location-services.md §3.1),
 * so a haversine distance check is sufficient and keeps this testable
 * without a spatial extension.
 */
export type GeoPoint = { lat: number; lng: number }

export type GeofencePlace = {
  id: string
  lat: number
  lng: number
  radiusM: number
}

const EARTH_RADIUS_M = 6371000

/** Great-circle distance between two points, in metres. */
export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function isWithinGeofence(point: GeoPoint, place: GeofencePlace): boolean {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return false
  if (!Number.isFinite(place.radiusM) || place.radiusM <= 0) return false
  return haversineDistanceMeters(point, place) <= place.radiusM
}

/**
 * Of the given places, return the closest one the point is currently inside
 * (or null if the point is outside all of them). Ties broken by distance so
 * a point inside two overlapping geofences resolves deterministically.
 */
export function nearestPlaceWithinRadius<T extends GeofencePlace>(
  point: GeoPoint,
  places: T[],
): { place: T; distanceM: number } | null {
  let best: { place: T; distanceM: number } | null = null
  for (const place of places) {
    if (!isWithinGeofence(point, place)) continue
    const distanceM = haversineDistanceMeters(point, place)
    if (!best || distanceM < best.distanceM) {
      best = { place, distanceM }
    }
  }
  return best
}
