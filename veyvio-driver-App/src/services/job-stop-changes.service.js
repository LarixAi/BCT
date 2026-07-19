import { getSupabaseClient } from "@/lib/supabase/client";
import { getFleetApiUrl } from "@/lib/auth-errors";

/** Fired when job stops change so navigation can recalculate. */
export const DRIVER_STOP_ITINERARY_CHANGED = "driver-stop-itinerary-changed";

export function notifyStopItineraryChanged(jobId) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DRIVER_STOP_ITINERARY_CHANGED, { detail: { jobId } }));
  }
}

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Submit a driver stop change through the fleet admin API (rules + approval).
 */
export async function submitDriverStopChange(jobId, change) {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: "Sign in required." };

  const baseUrl = getFleetApiUrl();
  if (!baseUrl) {
    return { ok: false, message: "Fleet API URL not configured (VITE_FLEET_API_URL)." };
  }

  try {
    const response = await fetch(`${baseUrl}/api/driver/itinerary-change`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, change }),
    });

    const result = await response.json();
    if (result.ok) {
      notifyStopItineraryChanged(jobId);
    }
    return result;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Request failed." };
  }
}
