/**
 * Geofence containment checks (docs/architecture/14-navigation-location-services.md Phase 1).
 * Imports the real pure module — a regression in isWithinGeofence or
 * nearestPlaceWithinRadius would fail this test, unlike a copy of the logic.
 * Run: npx tsx scripts/geofencing.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  haversineDistanceMeters,
  isWithinGeofence,
  nearestPlaceWithinRadius,
} from '../supabase/functions/_shared/geofencing.mapping.ts'

// London Bridge to Tower Bridge is ~892m (verified independently in Python) — sanity check the distance math.
const londonBridge = { lat: 51.5079, lng: -0.0877 }
const towerBridge = { lat: 51.5055, lng: -0.0754 }
const distance = haversineDistanceMeters(londonBridge, towerBridge)
assert.ok(distance > 850 && distance < 950, `expected ~892m, got ${distance}m`)

// Same point is always within any positive-radius geofence.
assert.equal(
  isWithinGeofence(londonBridge, { id: 'p1', ...londonBridge, radiusM: 50 }),
  true,
)

// A depot 1.1km away is outside a 120m geofence.
assert.equal(
  isWithinGeofence(londonBridge, { id: 'p1', ...towerBridge, radiusM: 120 }),
  false,
)

// A depot 1.1km away IS inside a radius that covers the distance.
assert.equal(
  isWithinGeofence(londonBridge, { id: 'p1', ...towerBridge, radiusM: 1500 }),
  true,
)

// Invalid/missing radius never matches — fail closed, not open.
assert.equal(
  isWithinGeofence(londonBridge, { id: 'p1', ...londonBridge, radiusM: 0 }),
  false,
)
assert.equal(
  isWithinGeofence(londonBridge, { id: 'p1', ...londonBridge, radiusM: Number.NaN }),
  false,
)

// nearestPlaceWithinRadius: picks the closer of two overlapping geofences,
// and returns null when the point is outside every candidate.
const near = { id: 'near', lat: 51.5080, lng: -0.0878, radiusM: 200 }
const far = { id: 'far', lat: 51.5090, lng: -0.0900, radiusM: 500 }
const result = nearestPlaceWithinRadius(londonBridge, [far, near])
assert.equal(result?.place.id, 'near')

const outside = nearestPlaceWithinRadius(londonBridge, [
  { id: 'too-far', ...towerBridge, radiusM: 10 },
])
assert.equal(outside, null)

console.log('geofencing.unit.mjs: all checks passed')
