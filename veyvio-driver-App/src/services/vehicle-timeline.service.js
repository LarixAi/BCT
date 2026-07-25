import { commandGetDriverVehicleTimeline } from "@/lib/command-api";
import { resolveAssignedVehicleId } from "@/lib/vehicle-readiness";
import { getSupabaseClient } from "@/lib/supabase/client";

async function readAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function loadAssignedVehicleTimeline({ bootstrap, vehicle } = {}) {
  const vehicleId = resolveAssignedVehicleId(bootstrap, vehicle);
  if (!vehicleId) {
    return { ok: false, message: "No vehicle assigned on your published duty." };
  }

  const token = await readAccessToken();
  if (!token) return { ok: false, message: "Sign in again to load vehicle history." };

  const result = await commandGetDriverVehicleTimeline(token, vehicleId);
  if (!result.ok) return result;
  return { ok: true, vehicleId, events: result.events ?? [] };
}
