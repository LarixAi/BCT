import { getSupabaseClient } from "@/lib/supabase/client";
import { geohashKey } from "@/lib/fleet-tracking-rules";

const UK_DEFAULT_MPH = 30;

export async function lookupSpeedLimitMph(organisationId, lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = geohashKey(lat, lng);
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from("fleet_speed_limit_cache")
    .select("speed_limit_mph, valid_until")
    .or(`organisation_id.eq.${organisationId},organisation_id.is.null`)
    .eq("road_segment_key", key)
    .order("confidence_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.speed_limit_mph) {
    if (!data.valid_until || new Date(data.valid_until).getTime() >= Date.now()) {
      return Number(data.speed_limit_mph);
    }
  }

  return UK_DEFAULT_MPH;
}
