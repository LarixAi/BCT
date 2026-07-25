import { commandPostDriverVehicleParked } from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  clearHandbackDraft,
  saveHandbackDraft,
} from "@/lib/vehicle-handback-draft.storage";

async function readAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function persistHandbackDraft(companyId, membershipId, vehicleId, draft) {
  saveHandbackDraft(companyId, membershipId, vehicleId, draft);
}

export async function submitVehicleHandback({
  vehicleId,
  depotId,
  dutyId,
  locationType = "BAY",
  bayNumber = null,
  freeTextLocation = null,
  keysReturned = true,
  keyLocation = "Key cabinet",
  fullyInsideBay = true,
  endMileage,
  fuelLevel,
  notes,
  handbackChecks,
  companyId,
  membershipId,
}) {
  const token = await readAccessToken();
  if (!token) return { ok: false, message: "Sign in again to submit handback." };

  const result = await commandPostDriverVehicleParked(token, {
    vehicleId,
    depotId,
    dutyId,
    locationType,
    bayNumber,
    freeTextLocation,
    keysReturned,
    keyLocation,
    fullyInsideBay,
    endMileage: endMileage != null ? Number(endMileage) : undefined,
    fuelLevel,
    notes,
    handbackChecks,
  });

  if (result.ok && companyId && membershipId && vehicleId) {
    clearHandbackDraft(companyId, membershipId, vehicleId);
  }

  return result;
}
