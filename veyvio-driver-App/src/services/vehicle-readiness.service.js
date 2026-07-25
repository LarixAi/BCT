import { commandGetDriverVehicleReadiness } from "@/lib/command-api";
import { resolveAssignedVehicleId } from "@/lib/vehicle-readiness";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadDriverBootstrap } from "@/services/driver-bootstrap.service";

async function readAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Load Command vehicle readiness for the driver's assigned vehicle.
 * Uses bootstrap cache when fresh; falls back to GET driver/vehicle-readiness.
 */
export async function loadAssignedVehicleReadiness({ bootstrap, vehicle, depotId, force = false } = {}) {
  const vehicleId = resolveAssignedVehicleId(bootstrap, vehicle);
  if (!vehicleId) {
    return { ok: false, message: "No vehicle assigned on your published duty." };
  }

  if (!force && bootstrap?.assignedVehicleReadiness?.vehicleId === vehicleId) {
    return { ok: true, readiness: bootstrap.assignedVehicleReadiness, source: "bootstrap" };
  }

  const bootResult = !bootstrap && !force ? await loadDriverBootstrap({ depotId, force: false }) : null;
  const boot = bootstrap ?? bootResult?.bootstrap;
  if (!force && boot?.assignedVehicleReadiness?.vehicleId === vehicleId) {
    return { ok: true, readiness: boot.assignedVehicleReadiness, source: "bootstrap" };
  }

  const token = await readAccessToken();
  if (!token) return { ok: false, message: "Sign in again to load vehicle readiness." };

  const result = await commandGetDriverVehicleReadiness(token, vehicleId);
  if (!result.ok) return result;
  return { ok: true, readiness: result.readiness, source: "command" };
}
