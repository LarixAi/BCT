import { getFleetApiUrl } from "@/lib/auth-errors";
import { getSupabaseClient } from "@/lib/supabase/client";

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function fleetApiPost(path, body) {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: "Sign in required." };

  const baseUrl = getFleetApiUrl();
  if (!baseUrl) return { ok: false, message: "Fleet API URL not configured." };

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return response.json();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Request failed." };
  }
}

export async function checkDriverLicenceEligibilityForJob(jobId) {
  return fleetApiPost("/api/driver/licence-eligibility", { jobId });
}

export async function loadDriverLicenceSummary(driverId) {
  const supabase = getSupabaseClient();
  const { data: licence } = await supabase
    .from("driver_licences")
    .select("licence_status, last_checked_at, next_check_due_at, licence_number_last4")
    .eq("driver_id", driverId)
    .maybeSingle();

  const { data: entitlements } = await supabase
    .from("driver_licence_entitlements")
    .select("category_code")
    .eq("driver_id", driverId)
    .eq("entitlement_status", "active");

  const { data: credentials } = await supabase
    .from("driver_professional_credentials")
    .select("credential_type, credential_status, expiry_date")
    .eq("driver_id", driverId);

  return {
    licence,
    categories: (entitlements ?? []).map((e) => e.category_code),
    credentials: credentials ?? [],
  };
}

export async function recordDriverLicenceConsent(driverId, organisationId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("driver_licence_check_consents").insert({
    organisation_id: organisationId,
    driver_id: driverId,
    consent_type: "driver_self_declaration",
    consent_status: "active",
    consent_given_at: new Date().toISOString(),
    notes: "Driver consented to licence check via mobile app",
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Consent recorded" };
}
