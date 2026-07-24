import { commandPostDriverVehicleParked } from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";

const SPECIAL_LOCATIONS = [
  { id: "workshop", label: "Workshop", locationType: "WORKSHOP" },
  { id: "wash", label: "Wash area", locationType: "WASH" },
  { id: "other", label: "Outside marked bay", locationType: "OTHER" },
];

export const BCT_BAY_OPTIONS = Array.from({ length: 26 }, (_, i) => {
  const n = i + 1;
  return { bayNumber: n, label: `Bay ${n}` };
});

export { SPECIAL_LOCATIONS };

async function readAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function reportDriverParkingLocation({
  vehicleId,
  depotId,
  dutyId,
  locationType = "BAY",
  bayNumber = null,
  freeTextLocation = null,
  keysReturned = true,
  keyLocation = "Key cabinet",
  fullyInsideBay = true,
}) {
  const token = await readAccessToken();
  if (!token) return { ok: false, message: "Sign in again to report parking." };

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
  });

  if (result?.ok && result.platformEvent && typeof localStorage !== "undefined") {
    try {
      const key = "veyvio.ops.platform.events.yard.v1";
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
      const list = Array.isArray(existing) ? existing : [];
      if (!list.some((e) => e?.eventId === result.platformEvent.eventId)) {
        localStorage.setItem(key, JSON.stringify([result.platformEvent, ...list].slice(0, 100)));
      }
    } catch {
      /* ignore */
    }
  }

  return result;
}
