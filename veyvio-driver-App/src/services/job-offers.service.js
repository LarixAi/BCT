import { getSupabaseClient } from "@/lib/supabase/client";

export async function getPendingJobOffers(driverId) {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("job_offers")
    .select(`
      id,
      job_id,
      driver_id,
      vehicle_id,
      offer_status,
      offer_method,
      expires_at,
      offered_at,
      job:jobs(
        id,
        route_name,
        job_type,
        job_number,
        service_date,
        scheduled_start_at,
        scheduled_end_at,
        pickup_json,
        dropoff_json,
        passenger_count
      )
    `)
    .eq("driver_id", driverId)
    .eq("offer_status", "pending")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("offered_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function acceptJobOffer(offerId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("accept_job_offer", { p_offer_id: offerId });
  if (error) throw new Error(error.message);
  const result = data ?? {};
  if (!result.ok) throw new Error(result.message ?? "Could not accept offer");
  return result;
}

export async function declineJobOffer(offerId, reason) {
  const supabase = getSupabaseClient();
  const { data: offer, error: fetchError } = await supabase
    .from("job_offers")
    .select("id, job_id, driver_id, organisation_id")
    .eq("id", offerId)
    .maybeSingle();

  if (fetchError || !offer) throw new Error(fetchError?.message ?? "Offer not found");

  const { error } = await supabase
    .from("job_offers")
    .update({
      offer_status: "declined",
      responded_at: new Date().toISOString(),
      response_reason: reason ?? null,
    })
    .eq("id", offerId);

  if (error) throw new Error(error.message);

  await supabase.from("job_status_events").insert({
    organisation_id: offer.organisation_id,
    job_id: offer.job_id,
    driver_id: offer.driver_id,
    event_type: "job_declined",
    notes: reason ?? "Declined by driver",
  });

  return { ok: true };
}

export function getOfferSecondsRemaining(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}
