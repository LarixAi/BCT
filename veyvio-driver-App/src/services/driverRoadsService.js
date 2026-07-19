/**
 * Phase 4 — Google Roads (Snap-to-Roads) client wrapper.
 *
 * Calls the `driver-snap-to-roads` edge function. The edge function holds
 * the API key and enforces a monthly quota. This client only batches points
 * and surfaces fallback reasons.
 */
import { getSupabaseClient } from "@/lib/supabase/client";

/** Upper bound from Google: 100 points per request. Edge function enforces too. */
export const ROADS_MAX_POINTS_PER_REQUEST = 100;

/** Google docs recommend points be ≤ 300 m apart for best snap quality. */
export const ROADS_MAX_POINT_SPACING_M = 300;

/**
 * Snap a batch of raw GPS points to the nearest road.
 *
 * @param {object} args
 * @param {{latitude:number,longitude:number}[]} args.points  2..100 points.
 * @param {boolean} [args.interpolate=true]                   Fills tunnels/bridges.
 * @param {boolean} [args.testMode=false]                     Skip Google entirely.
 * @returns {Promise<{ snappedPoints: any[], fallback?: boolean, reason?: string, quota?: object }>}
 */
export async function snapPointsToRoads({ points, interpolate = true, testMode = false }) {
  if (!Array.isArray(points) || points.length < 2) {
    return { snappedPoints: [], fallback: true, reason: "insufficient_points" };
  }

  const trimmed = points.slice(-ROADS_MAX_POINTS_PER_REQUEST);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("driver-snap-to-roads", {
    body: { points: trimmed, interpolate, testMode },
  });

  if (error) {
    return {
      snappedPoints: [],
      fallback: true,
      reason: error.message || "edge_function_error",
    };
  }
  if (data?.fallback) {
    return {
      snappedPoints: [],
      fallback: true,
      reason: data.reason ?? "fallback",
      quota: data.quota ?? null,
    };
  }
  return {
    snappedPoints: data?.snappedPoints ?? [],
    quota: data?.quota ?? null,
  };
}
