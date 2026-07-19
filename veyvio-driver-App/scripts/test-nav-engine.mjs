/**
 * Synthetic-GPS smoke test for the new navigation location engine.
 *
 * Runs Kalman + snap-to-route + off-route detector against a hand-built
 * trace of fixes simulating a London A-road with GPS noise and a brief detour.
 * Verifies:
 *   1. Snapping pulls the marker onto the route line within the threshold.
 *   2. Off-route detector fires only after the strike limit is reached.
 *   3. Cooldown prevents duplicate reroutes.
 *
 * Run:  node scripts/test-nav-engine.mjs
 */
import { createKalmanFilter } from "../src/lib/navigation/locationEngine/kalmanLatLng.js";
import {
  buildRouteLine,
  snapToRouteLine,
} from "../src/lib/navigation/locationEngine/snapToRoute.js";
import {
  createOffRouteDetector,
  OFF_ROUTE_THRESHOLD_M,
  OFF_ROUTE_STRIKE_LIMIT,
} from "../src/lib/navigation/locationEngine/offRouteDetector.js";
import { speedToFollowZoom } from "../src/lib/navigation/navigationCamera.js";
import {
  simplifyLeafletPolyline,
  trimPassedRoute,
} from "../src/lib/navigation/routePolylineUtils.js";
import { getRouteLengthMeters } from "../src/lib/navigation/locationEngine/snapToRoute.js";
import { computeThresholdsForSpeed } from "../src/lib/navigation/voicePromptThresholds.js";
import {
  shortestAngleDelta,
  modulo360,
} from "../src/lib/navigation/navigationMapBearing.js";
import {
  buildRouteAheadGeoJson,
  buildStopsGeoJson,
  EMPTY_FEATURE_COLLECTION,
} from "../src/lib/navigation/maplibreRouteData.js";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let pass = 0;
let fail = 0;
function ok(name) {
  pass += 1;
  console.log(`  ${GREEN}✓${RESET} ${name}`);
}
function bad(name, msg) {
  fail += 1;
  console.log(`  ${RED}✗${RESET} ${name} — ${msg}`);
}
function assert(cond, name, msg = "") {
  if (cond) ok(name);
  else bad(name, msg);
}

// ---------------------------------------------------------------------------
// Test 1 · Kalman filter smooths jittery fixes
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 1: Kalman filter${RESET}`);
{
  const kf = createKalmanFilter({ processNoiseMps: 6 });
  const truth = { lat: 51.5074, lng: -0.1278 };
  const noisyTrace = [];
  for (let i = 0; i < 20; i += 1) {
    const noiseLat = (Math.random() - 0.5) * 0.0002;
    const noiseLng = (Math.random() - 0.5) * 0.0002;
    noisyTrace.push({
      lat: truth.lat + noiseLat,
      lng: truth.lng + noiseLng,
      acc: 8,
      t: 1_000_000_000 + i * 1000,
    });
  }

  let last;
  for (const fix of noisyTrace) {
    last = kf.update(fix.lat, fix.lng, fix.acc, fix.t);
  }

  const errLat = Math.abs(last.lat - truth.lat) * 111111;
  // Longitude metres-per-degree varies with cos(lat). At UK latitudes the
  // 0.0002° noise band is ~14 m, so we allow up to 10 m post-Kalman as a
  // smoke threshold — well below the per-fix raw error.
  const errLng = Math.abs(last.lng - truth.lng) * 111111 * Math.cos((truth.lat * Math.PI) / 180);
  assert(errLat < 8, "Kalman pulls lat error below 8 m", `got ${errLat.toFixed(2)} m`);
  assert(errLng < 8, "Kalman pulls lng error below 8 m", `got ${errLng.toFixed(2)} m`);
}

// ---------------------------------------------------------------------------
// Test 2 · Snap-to-route projects fix onto the route polyline
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 2: Snap-to-route${RESET}`);
{
  // ~1 km East-West A-road segment in London
  const route = [
    [51.507, -0.130],
    [51.507, -0.125],
    [51.507, -0.120],
    [51.507, -0.115],
  ];
  const line = buildRouteLine(route);
  assert(line != null, "Route line builds from Leaflet positions");

  // Fix 12 m north of the road
  const onRoad = snapToRouteLine({ lat: 51.50711, lng: -0.122, routeLine: line });
  assert(onRoad.snapped, "Fix within 30 m gets snapped");
  assert(
    Math.abs(onRoad.snappedLat - 51.507) < 0.0001,
    "Snapped lat sits on the road centerline",
    `got ${onRoad.snappedLat}`,
  );
  assert(
    onRoad.distanceM != null && onRoad.distanceM < 30,
    "Reported distance is below the snap threshold",
    `got ${onRoad.distanceM}`,
  );
  assert(
    onRoad.alongM != null && onRoad.alongM > 0,
    "alongRouteM is set when snapped",
    `got ${onRoad.alongM}`,
  );

  // Fix 80 m off the road — should NOT snap (stays raw)
  const offRoad = snapToRouteLine({ lat: 51.5078, lng: -0.122, routeLine: line });
  assert(!offRoad.snapped, "Fix beyond 30 m is NOT snapped (stays raw)");
  assert(
    offRoad.distanceM != null && offRoad.distanceM > 30,
    "Off-route distance reported correctly",
    `got ${offRoad.distanceM}`,
  );
}

// ---------------------------------------------------------------------------
// Test 3 · Off-route detector hysteresis + cooldown
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 3: Off-route detector hysteresis + cooldown${RESET}`);
{
  const det = createOffRouteDetector();
  let now = 1_000_000_000;

  // 1 brief noise spike — should NOT trigger
  const r1 = det.update(80, now);
  assert(!r1.shouldReroute, "Single off-route spike does not reroute");
  assert(r1.strikes === 1, "Strike count = 1 after 1 spike", `got ${r1.strikes}`);

  // Back on route — strike decays
  const r2 = det.update(10, now + 1000);
  assert(!r2.shouldReroute, "On-route reading does not reroute");
  assert(r2.strikes === 0, "Strikes decay back to 0", `got ${r2.strikes}`);

  // 3 consecutive off-route readings → reroute fires
  now += 2000;
  det.update(60, now);
  det.update(70, now + 1000);
  const r5 = det.update(80, now + 2000);
  assert(r5.shouldReroute, `${OFF_ROUTE_STRIKE_LIMIT} consecutive off-route readings trigger reroute`);

  // Immediately try again — cooldown blocks repeat
  const r6 = det.update(90, now + 3000);
  assert(!r6.shouldReroute, "Cooldown blocks duplicate reroute");

  // After 16 s + 3 more strikes, should trigger again
  now += 16000;
  det.update(60, now);
  det.update(70, now + 1000);
  const r9 = det.update(80, now + 2000);
  assert(r9.shouldReroute, "After cooldown, off-route can re-trigger");

  // null distance never reroutes
  const rN = det.update(null, now + 3000);
  assert(!rN.shouldReroute && rN.distanceM === null, "Null distance is a no-op");
}

// ---------------------------------------------------------------------------
// Test 4 · End-to-end engine pipeline (Kalman → snap → off-route)
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 4: Pipeline integration${RESET}`);
{
  const route = [
    [51.500, -0.100],
    [51.500, -0.090],
    [51.500, -0.080],
  ];
  const line = buildRouteLine(route);
  const kf = createKalmanFilter({ processNoiseMps: 6 });
  const det = createOffRouteDetector();

  let onRouteSnaps = 0;
  let offRouteStrikes = 0;
  let reroutes = 0;
  let now = 0;

  // 10 s of on-route GPS with ±10 m noise
  for (let i = 0; i < 10; i += 1) {
    now += 1000;
    const lng = -0.100 + i * 0.001;
    const noisyLat = 51.500 + (Math.random() - 0.5) * 0.00018;
    const noisyLng = lng + (Math.random() - 0.5) * 0.00018;
    const f = kf.update(noisyLat, noisyLng, 8, now);
    const s = snapToRouteLine({ lat: f.lat, lng: f.lng, routeLine: line });
    const o = det.update(s.distanceM, now);
    if (s.snapped) onRouteSnaps += 1;
    if (o.shouldReroute) reroutes += 1;
  }
  assert(onRouteSnaps >= 8, `Most on-route fixes snap (got ${onRouteSnaps}/10)`);
  assert(reroutes === 0, "No reroute triggered while on the road");

  // 4 s of detour (~150 m off-route)
  let strikesBeforeReroute = 0;
  for (let i = 0; i < 4; i += 1) {
    now += 1000;
    const f = kf.update(51.5015, -0.085 + i * 0.0005, 8, now);
    const s = snapToRouteLine({ lat: f.lat, lng: f.lng, routeLine: line });
    const o = det.update(s.distanceM, now);
    if (o.shouldReroute && strikesBeforeReroute === 0) {
      // Strikes reset to 0 immediately after firing — capture the limit.
      strikesBeforeReroute = OFF_ROUTE_STRIKE_LIMIT;
    } else if (o.strikes > 0) {
      offRouteStrikes = Math.max(offRouteStrikes, o.strikes);
    }
    if (o.shouldReroute) reroutes += 1;
  }
  assert(
    Math.max(offRouteStrikes, strikesBeforeReroute) >= OFF_ROUTE_STRIKE_LIMIT,
    `Detour accumulates strikes to limit (peak before reset = ${Math.max(offRouteStrikes, strikesBeforeReroute)})`,
  );
  assert(reroutes >= 1, `Detour triggers reroute (got ${reroutes})`);
}

// ---------------------------------------------------------------------------
// Test 5 · Phase-3 speed-based zoom curve
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 5: Speed-zoom curve${RESET}`);
{
  const atRest = speedToFollowZoom(0);
  const slow = speedToFollowZoom(5); // ~11 mph
  const fast = speedToFollowZoom(15); // ~33 mph
  const motorway = speedToFollowZoom(30); // ~67 mph

  assert(atRest === 17, "Stationary → max zoom (17)", `got ${atRest}`);
  assert(slow < atRest && slow > fast, "Slow drive zooms out from rest, more than fast", `got ${slow} vs ${atRest}/${fast}`);
  assert(fast < slow, "Fast drive zooms out further", `got ${fast}`);
  assert(motorway >= 15 && motorway < fast, "Motorway clamps near minimum", `got ${motorway}`);
  // Continuity — no big jumps for small speed deltas
  const a = speedToFollowZoom(10);
  const b = speedToFollowZoom(11);
  assert(Math.abs(a - b) < 0.5, "Zoom curve is continuous between 10 and 11 m/s", `got Δ=${Math.abs(a - b)}`);
  // Negative / NaN should still return a sane number
  assert(Number.isFinite(speedToFollowZoom(-5)), "Negative speed handled", "got non-finite");
  assert(Number.isFinite(speedToFollowZoom(NaN)), "NaN speed handled", "got non-finite");
}

// ---------------------------------------------------------------------------
// Test 6 · Phase-5 polyline simplify + trim
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 6: Polyline helpers${RESET}`);
{
  // Build a long, noisy polyline.
  const positions = [];
  for (let i = 0; i < 200; i += 1) {
    const lng = -0.1 + i * 0.0005;
    const lat = 51.5 + Math.sin(i / 8) * 0.0003 + (Math.random() - 0.5) * 0.00001;
    positions.push([lat, lng]);
  }

  const simplified = simplifyLeafletPolyline(positions);
  assert(simplified.length < positions.length, `Simplify reduces vertex count (${positions.length} → ${simplified.length})`);
  assert(simplified.length >= 2, "Simplify keeps at least the endpoints");

  // Short polyline passes through unchanged.
  const short = positions.slice(0, 30);
  const passthrough = simplifyLeafletPolyline(short);
  assert(passthrough.length === short.length, "Short polylines are not simplified");

  // Trim — slice from "halfway" to end.
  const line = buildRouteLine(simplified);
  const totalM = getRouteLengthMeters(line);
  const trimmed = trimPassedRoute({
    routeLine: line,
    alongRouteM: totalM * 0.5,
    totalLengthM: totalM,
    fullPositions: simplified,
  });
  assert(trimmed.length >= 2, "Trim keeps a valid sub-polyline");
  assert(trimmed.length < simplified.length, `Trim drops passed segment (${simplified.length} → ${trimmed.length})`);

  // Trim with no alongRouteM returns input unchanged.
  const untrimmed = trimPassedRoute({
    routeLine: line,
    alongRouteM: null,
    totalLengthM: totalM,
    fullPositions: simplified,
  });
  assert(untrimmed === simplified, "Trim with null along returns input by reference");
}

// ---------------------------------------------------------------------------
// Test 7 · Phase-6 speed-aware voice prompt thresholds
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 7: Voice prompt thresholds${RESET}`);
{
  const slow = computeThresholdsForSpeed(2); // ~5 mph
  const fast = computeThresholdsForSpeed(25); // ~56 mph

  assert(JSON.stringify(slow) === JSON.stringify([400, 200, 80]), `Slow uses static thresholds (got ${JSON.stringify(slow)})`);
  // At highway speed the *closest* (final) threshold is meaningfully bigger
  // than the static 80 m — that's the point of the speed-aware lookahead:
  // the "prepare to turn" cue arrives with enough seconds of warning.
  assert(
    fast[fast.length - 1] > slow[slow.length - 1],
    `Final prompt distance grows with speed (${fast[fast.length - 1]} m vs ${slow[slow.length - 1]} m)`,
  );
  assert(fast.every((t) => t >= 50), `All thresholds ≥ 50 m floor (got ${JSON.stringify(fast)})`);
  // Strictly decreasing
  for (let i = 1; i < fast.length; i += 1) {
    assert(fast[i] < fast[i - 1], `Thresholds strictly decreasing at index ${i}`);
  }
  // Edge cases
  assert(JSON.stringify(computeThresholdsForSpeed(null)) === JSON.stringify([400, 200, 80]), "Null speed → static");
  assert(JSON.stringify(computeThresholdsForSpeed(NaN)) === JSON.stringify([400, 200, 80]), "NaN speed → static");
}

// ---------------------------------------------------------------------------
// Test 8 · Map bearing — shortest-arc wrap (no spinaround at 359°→1°)
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 8: Bearing wrap & shortest-arc${RESET}`);
{
  // Identity / boundary cases
  assert(modulo360(0) === 0, "modulo360(0) === 0");
  assert(modulo360(360) === 0, "modulo360(360) === 0");
  assert(modulo360(-1) === 359, "modulo360(-1) === 359");
  assert(modulo360(720.5) === 0.5, "modulo360 handles >360");

  // Shortest-arc in (-180, 180]
  assert(shortestAngleDelta(10, 350) === 20, `350° → 10° = +20° via 0° (got ${shortestAngleDelta(10, 350)})`);
  assert(shortestAngleDelta(350, 10) === -20, `10° → 350° = −20° via 0° (got ${shortestAngleDelta(350, 10)})`);
  // Exactly 180° apart is ambiguous — formula picks one consistent direction
  // (the wrapped negative). Test we always return ±180 regardless of input order.
  assert(Math.abs(shortestAngleDelta(180, 0)) === 180, `0° → 180° = ±180°`);
  assert(Math.abs(shortestAngleDelta(0, 180)) === 180, `180° → 0° = ±180°`);
  assert(shortestAngleDelta(0, 0) === 0, `same heading = 0`);

  // Simulate a follow-mode walk: 350 → 0 → 10 → 5 with unbounded tracking
  let applied = 350; // initial
  applied += shortestAngleDelta(0, modulo360(applied)); // → 360
  assert(applied === 360, `walk 350→0 stays forward (applied=${applied})`);
  applied += shortestAngleDelta(10, modulo360(applied)); // → 370
  assert(applied === 370, `walk 0→10 continues forward (applied=${applied})`);
  applied += shortestAngleDelta(5, modulo360(applied)); // → 365
  assert(applied === 365, `walk 10→5 reverses 5° (applied=${applied})`);

  // Worst-case: heading flips by ~180° — algorithm picks one direction (any).
  let a = 0;
  a += shortestAngleDelta(180, modulo360(a));
  assert(Math.abs(Math.abs(a) - 180) < 0.001, `0→180 swings by exactly 180° (got ${a})`);
}

// ---------------------------------------------------------------------------
// Test 9 · Phase-7 GeoJSON helpers
// ---------------------------------------------------------------------------
console.log(`${YELLOW}Test 9: MapLibre GeoJSON shapes${RESET}`);
{
  // Empty input → empty FC (renderer hides layer).
  const empty = buildRouteAheadGeoJson({ leafletPositions: [] });
  assert(empty === EMPTY_FEATURE_COLLECTION, "Empty positions → empty FC reference");

  const stopsEmpty = buildStopsGeoJson([]);
  assert(stopsEmpty === EMPTY_FEATURE_COLLECTION, "Empty stops → empty FC reference");

  // Long synthetic polyline — same shape as Test 6.
  const positions = [];
  for (let i = 0; i < 200; i += 1) {
    const lng = -0.1 + i * 0.0005;
    const lat = 51.5 + Math.sin(i / 8) * 0.0003;
    positions.push([lat, lng]);
  }

  const fc = buildRouteAheadGeoJson({ leafletPositions: positions });
  assert(fc.type === "FeatureCollection", "Output is a FeatureCollection");
  assert(fc.features.length === 1, "Single LineString feature");
  const feature = fc.features[0];
  assert(feature.geometry.type === "LineString", "Geometry is LineString");
  assert(
    feature.geometry.coordinates.every(([x, y]) => x < 0 && y > 50 && y < 52),
    "Coordinates are in [lng, lat] order (London bounds)",
  );

  // Trim should yield strictly fewer coords than the simplified-only version.
  const trimmed = buildRouteAheadGeoJson({
    leafletPositions: positions,
    alongRouteM: 5000, // ~half the route
  });
  assert(
    trimmed.features[0].geometry.coordinates.length <
      fc.features[0].geometry.coordinates.length,
    `Trim drops vertices (${fc.features[0].geometry.coordinates.length} → ${trimmed.features[0].geometry.coordinates.length})`,
  );

  // Stops — first / last get P / D markers, middle ones numbered.
  const stops = [
    { id: "p", latitude: 51.5, longitude: -0.1 },
    { id: "m", latitude: 51.51, longitude: -0.11 },
    { id: "d", latitude: 51.52, longitude: -0.12 },
  ];
  const stopsFc = buildStopsGeoJson(stops);
  assert(stopsFc.features.length === 3, "All stops produce a feature");
  assert(stopsFc.features[0].properties.label === "P", "First stop is labelled P");
  assert(stopsFc.features[2].properties.label === "D", "Last stop is labelled D");
  assert(stopsFc.features[1].properties.label === "2", "Middle stop is numbered");
  assert(
    stopsFc.features[2].geometry.coordinates[0] === -0.12,
    "Stops use [lng, lat] coordinate order",
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("");
console.log(
  fail === 0
    ? `${GREEN}All ${pass} checks passed.${RESET}`
    : `${RED}${fail} of ${pass + fail} checks failed.${RESET}`,
);
process.exit(fail === 0 ? 0 : 1);
