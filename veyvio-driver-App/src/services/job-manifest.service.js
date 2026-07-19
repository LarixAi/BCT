import { getSupabaseClient } from "@/lib/supabase/client";
import { getFleetApiUrl } from "@/lib/auth-errors";

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

export async function loadDriverJobManifest(jobId, stopStatusById = new Map()) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_stop_passengers")
    .select(`
      id,
      job_stop_id,
      passenger_id,
      boarding_type,
      status,
      passenger:passengers(first_name, last_name, preferred_name, safeguarding_notes)
    `)
    .eq("job_id", jobId);

  if (error) return { rows: [], error: error.message };

  const byPassenger = new Map();

  for (const row of data ?? []) {
    const passenger = Array.isArray(row.passenger) ? row.passenger[0] : row.passenger;
    const name = passenger
      ? `${passenger.first_name ?? ""} ${passenger.last_name ?? ""}`.trim()
      : "Passenger";
    const entry = byPassenger.get(row.passenger_id) ?? {
      passengerId: row.passenger_id,
      passengerName: name,
      preferredName: passenger?.preferred_name ?? null,
      safeguardingFlag: Boolean(passenger?.safeguarding_notes?.trim()),
      pickupManifestId: null,
      dropoffManifestId: null,
      pickupStatus: null,
      dropoffStatus: null,
      pickupStopId: null,
      dropoffStopId: null,
    };

    if (row.boarding_type === "pickup") {
      entry.pickupManifestId = row.id;
      entry.pickupStatus = row.status;
      entry.pickupStopId = row.job_stop_id;
    } else {
      entry.dropoffManifestId = row.id;
      entry.dropoffStatus = row.status;
      entry.dropoffStopId = row.job_stop_id;
    }

    byPassenger.set(row.passenger_id, entry);
  }

  const rows = [...byPassenger.values()].map((entry) => {
    const pickupStopStatus = entry.pickupStopId
      ? stopStatusById.get(entry.pickupStopId)
      : null;
    const dropoffStopStatus = entry.dropoffStopId
      ? stopStatusById.get(entry.dropoffStopId)
      : null;
    const pickupActive = pickupStopStatus && ["arrived", "completed"].includes(pickupStopStatus);
    const dropoffActive = dropoffStopStatus && ["arrived", "completed"].includes(dropoffStopStatus);

    return {
      ...entry,
      canBoard: Boolean(entry.pickupManifestId) && entry.pickupStatus === "planned" && pickupActive,
      canNoShow: Boolean(entry.pickupManifestId) && entry.pickupStatus === "planned" && pickupActive,
      canDropOff:
        Boolean(entry.dropoffManifestId) &&
        entry.pickupStatus === "boarded" &&
        entry.dropoffStatus === "planned" &&
        dropoffActive,
    };
  });

  return { rows };
}

export function manifestAction(jobId, action, jobStopPassengerId, reason, extras = {}) {
  return fleetApiPost("/api/driver/manifest-action", {
    jobId,
    action,
    jobStopPassengerId,
    reason,
    ...extras,
  });
}

export async function uploadNoShowEvidence(driver, jobId, manifestId, file) {
  const supabase = getSupabaseClient();
  const buffer = await file.arrayBuffer();
  const safeName = String(file.name ?? "photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_") || "photo.jpg";
  const storagePath = `org/${driver.organisationId}/manifest-no-show/${jobId}/${manifestId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from("incident-evidence").upload(storagePath, buffer, {
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, path: storagePath };
}

export async function geocodeDriverStop(input) {
  return fleetApiPost("/api/driver/geocode-stop", input);
}
