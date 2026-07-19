/**
 * Phase 6 — pure helpers for distance-prompt thresholds.
 *
 * Lives in its own file (no Capacitor / DOM imports) so it can be unit
 * tested directly with `node` and reused by both the voice runner and any
 * future logging/telemetry surfaces.
 */
export const STATIC_THRESHOLDS_METRES = [400, 200, 80];
/** Lookaheads (seconds before the maneuver). Shrinking slots = drop-in cues. */
export const LOOKAHEAD_SECONDS = [15, 8, 4];
export const MIN_PROMPT_DISTANCE_M = 50;
/** Below this speed (m/s ≈ 13 mph) static distances feel right. */
export const STATIC_THRESHOLD_SPEED_MPS = 6;

export function computeThresholdsForSpeed(speedMps) {
  const safeSpeed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  if (safeSpeed < STATIC_THRESHOLD_SPEED_MPS) {
    return [...STATIC_THRESHOLDS_METRES];
  }
  const dynamic = LOOKAHEAD_SECONDS.map((t) =>
    Math.max(MIN_PROMPT_DISTANCE_M, Math.round(safeSpeed * t)),
  );
  return Array.from(new Set(dynamic)).sort((a, b) => b - a);
}
