/**
 * Leaflet map-pane rotation helper.
 *
 * Why this is non-trivial: CSS `transform: rotate(deg)` doesn't know about
 * 360° wrap, so going from `rotate(-359deg)` to `rotate(-1deg)` animates
 * +358° backwards instead of the intended +2° forward arc. We track the
 * **unbounded** applied angle per map and always advance by the shortest
 * angular delta, so the visual rotation always takes the short way around.
 *
 * The unbounded value can grow without limit; that's fine — CSS handles
 * arbitrarily large rotations without precision problems in practice.
 */

const mapBearingState = new WeakMap();

/** Signed delta in (-180, 180] from `current` to `target`. */
function shortestAngleDelta(target, current) {
  return ((target - current + 540) % 360) - 180;
}

function modulo360(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Apply map rotation so "up" aligns with vehicle heading (Leaflet map pane). */
export function setMapBearing(map, bearingDeg = 0) {
  if (!map) return;
  const pane = map.getPanes()?.mapPane;
  if (!pane) return;

  const target = Number.isFinite(bearingDeg) ? bearingDeg : 0;
  const state = mapBearingState.get(map);

  pane.style.transformOrigin = "50% 50%";

  if (!state) {
    // First call for this map — place the pane immediately, no transition,
    // so we don't get a startup spin from 0°.
    pane.style.transition = "";
    pane.style.transform = target === 0 ? "" : `rotate(${-target}deg)`;
    mapBearingState.set(map, { applied: target });
    return;
  }

  const currentMod = modulo360(state.applied);
  const delta = shortestAngleDelta(target, currentMod);
  const newApplied = state.applied + delta;

  // Tight 0.25 s linear transition — at the camera's ~4–5 Hz update rate
  // this stays smooth without lagging behind dead-reckoned fixes.
  pane.style.transition = "transform 0.25s linear";
  pane.style.transform = `rotate(${-newApplied}deg)`;

  mapBearingState.set(map, { applied: newApplied });
}

export function clearMapBearing(map) {
  if (!map) return;
  const pane = map.getPanes()?.mapPane;
  if (!pane) return;
  pane.style.transition = "";
  pane.style.transform = "";
  mapBearingState.delete(map);
}

// Re-exported for tests.
export { shortestAngleDelta, modulo360 };
