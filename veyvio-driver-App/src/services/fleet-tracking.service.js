import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { getSupabaseClient } from "@/lib/supabase/client";

const SESSION_KEY_PREFIX = "csf_fleet_active_session:";

function sessionStorageKey(driverId) {
  return `${SESSION_KEY_PREFIX}${driverId}`;
}

export function getStoredActiveSessionId(driverId) {
  try {
    return localStorage.getItem(sessionStorageKey(driverId));
  } catch {
    return null;
  }
}

function setStoredActiveSessionId(driverId, sessionId) {
  try {
    if (sessionId) localStorage.setItem(sessionStorageKey(driverId), sessionId);
    else localStorage.removeItem(sessionStorageKey(driverId));
  } catch {
    /* ignore */
  }
}

export async function ensureLocationPermission() {
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.requestPermissions();
    if (perm.location === "granted" || perm.coarseLocation === "granted") {
      return { ok: true };
    }
    return {
      ok: false,
      message: "Location permission is required to sign on and track duty. Enable it in your phone settings.",
    };
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    return { ok: true };
  }

  return { ok: false, message: "Location is not available on this device." };
}

async function readBatteryLevel() {
  if (typeof navigator !== "undefined" && navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      return Math.round(battery.level * 100);
    } catch {
      return null;
    }
  }
  return null;
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    organisationId: row.organisation_id,
    depotId: row.depot_id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    jobId: row.job_id,
    driverShiftId: row.driver_shift_id,
    sessionType: row.session_type,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distanceMiles: row.distance_miles != null ? Number(row.distance_miles) : 0,
    maxSpeedMph: row.max_speed_mph != null ? Number(row.max_speed_mph) : null,
    averageSpeedMph: row.average_speed_mph != null ? Number(row.average_speed_mph) : null,
    pingCount: Number(row.ping_count ?? 0),
  };
}

async function findOpenShift(driver) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("driver_shifts")
    .select("id, vehicle_id, sign_on_at")
    .eq("driver_id", driver.id)
    .eq("status", "open")
    .is("sign_off_at", null)
    .order("sign_on_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Ensures a fleet_tracking_sessions row exists for a driver with an open shift.
 * Used as a recovery path when sign-on didn't create a session (e.g. permission
 * denied, app upgraded mid-shift, network blip).
 */
export async function ensureFleetSessionForOpenShift(driver) {
  if (!driver?.id) return null;

  const existing = await getActiveFleetSession(driver);
  if (existing) return existing;

  const shift = await findOpenShift(driver);
  if (!shift) return null;

  const result = await startFleetSession(driver, {
    shiftId: shift.id,
    vehicleId: shift.vehicle_id ?? null,
    depotId: driver.homeDepotId ?? null,
    requirePermission: false,
  });
  return result.ok ? result.session : null;
}

export async function getActiveFleetSession(driver) {
  const storedId = getStoredActiveSessionId(driver.id);
  const supabase = getSupabaseClient();

  if (storedId) {
    const { data } = await supabase
      .from("fleet_tracking_sessions")
      .select("*")
      .eq("id", storedId)
      .eq("driver_id", driver.id)
      .eq("status", "active")
      .maybeSingle();
    if (data) return mapSession(data);
    setStoredActiveSessionId(driver.id, null);
  }

  const { data } = await supabase
    .from("fleet_tracking_sessions")
    .select("*")
    .eq("driver_id", driver.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    setStoredActiveSessionId(driver.id, data.id);
    return mapSession(data);
  }

  return null;
}

export async function startFleetSession(driver, { shiftId, vehicleId, depotId, lat, lng, requirePermission = true } = {}) {
  if (requirePermission) {
    const permission = await ensureLocationPermission();
    if (!permission.ok) return permission;
  }

  const existing = await getActiveFleetSession(driver);
  if (existing) return { ok: true, session: existing, message: "Tracking session already active." };

  const supabase = getSupabaseClient();
  const battery = await readBatteryLevel();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("fleet_tracking_sessions")
    .insert({
      organisation_id: driver.organisationId,
      depot_id: depotId ?? driver.homeDepotId ?? null,
      driver_id: driver.id,
      vehicle_id: vehicleId ?? null,
      driver_shift_id: shiftId ?? null,
      session_type: "duty",
      status: "active",
      started_at: now,
      start_lat: lat ?? null,
      start_lng: lng ?? null,
      phone_battery_start: battery,
      ping_count: 0,
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  setStoredActiveSessionId(driver.id, data.id);
  return { ok: true, session: mapSession(data), message: "Fleet tracking started." };
}

export async function stopFleetSession(driver, { lat, lng } = {}) {
  const session = await getActiveFleetSession(driver);
  if (!session) return { ok: true, message: "No active tracking session." };

  const supabase = getSupabaseClient();
  const battery = await readBatteryLevel();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("fleet_tracking_sessions")
    .update({
      status: "completed",
      ended_at: now,
      end_lat: lat ?? null,
      end_lng: lng ?? null,
      job_id: null,
      phone_battery_end: battery,
    })
    .eq("id", session.id)
    .eq("driver_id", driver.id);

  if (error) return { ok: false, message: error.message };

  let safetyScore = null;
  try {
    const { rollupSessionScores } = await import("@/services/fleet-behaviour.service");
    safetyScore = await rollupSessionScores(session.id);
  } catch {
    /* optional */
  }

  setStoredActiveSessionId(driver.id, null);
  return {
    ok: true,
    message: "Fleet tracking stopped.",
    safetyScore,
    session: { ...session, safetyScore, pingCount: session.pingCount, maxSpeedMph: session.maxSpeedMph },
  };
}

export async function linkJobToSession(driver, { jobId, vehicleId } = {}) {
  const session = await getActiveFleetSession(driver);
  if (!session) {
    return { ok: false, message: "No active tracking session. Sign on to duty first." };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("fleet_tracking_sessions")
    .update({
      job_id: jobId ?? null,
      vehicle_id: vehicleId ?? session.vehicleId,
    })
    .eq("id", session.id)
    .eq("driver_id", driver.id);

  if (error) return { ok: false, message: error.message };
  return { ok: true, session: { ...session, jobId, vehicleId: vehicleId ?? session.vehicleId } };
}

/** Attach the active job to the fleet session so GPS pings include job_id for customer tracking. */
export async function ensureJobLinkedToFleetSession(driver, { jobId, vehicleId } = {}) {
  if (!driver?.id || !jobId) return { ok: false, message: "Missing driver or job" };
  return linkJobToSession(driver, { jobId, vehicleId });
}

export async function unlinkJobFromSession(driver) {
  const session = await getActiveFleetSession(driver);
  if (!session) return { ok: true };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("fleet_tracking_sessions")
    .update({ job_id: null })
    .eq("id", session.id)
    .eq("driver_id", driver.id);

  if (error) return { ok: false, message: error.message };
  return { ok: true, session: { ...session, jobId: null } };
}

export async function getJobTripSummary(driver, jobId) {
  const session = await getActiveFleetSession(driver);
  if (!session) return null;

  const supabase = getSupabaseClient();
  const { data: pings } = await supabase
    .from("driver_location_pings")
    .select("speed_mph, recorded_at")
    .eq("session_id", session.id)
    .eq("job_id", jobId)
    .order("recorded_at", { ascending: true });

  const rows = pings ?? [];
  if (rows.length === 0) {
    return {
      jobId,
      sessionId: session.id,
      pingCount: 0,
      maxSpeedMph: null,
      driveMinutes: null,
      startedAt: null,
      endedAt: null,
    };
  }

  const speeds = rows
    .map((r) => r.speed_mph)
    .filter((s) => typeof s === "number" && Number.isFinite(s));
  const startedAt = rows[0].recorded_at;
  const endedAt = rows[rows.length - 1].recorded_at;
  const driveMinutes = Math.max(
    1,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000),
  );

  return {
    jobId,
    sessionId: session.id,
    pingCount: rows.length,
    maxSpeedMph: speeds.length ? Math.max(...speeds) : null,
    driveMinutes,
    startedAt,
    endedAt,
  };
}

export async function incrementSessionPingStats(sessionId, speedMph) {
  const supabase = getSupabaseClient();
  const { data: session } = await supabase
    .from("fleet_tracking_sessions")
    .select("ping_count, max_speed_mph, average_speed_mph")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return;

  const pingCount = Number(session.ping_count ?? 0) + 1;
  const prevAvg = session.average_speed_mph != null ? Number(session.average_speed_mph) : null;
  const prevMax = session.max_speed_mph != null ? Number(session.max_speed_mph) : null;
  const speed = typeof speedMph === "number" && Number.isFinite(speedMph) ? speedMph : null;

  let averageSpeedMph = prevAvg;
  if (speed != null) {
    averageSpeedMph =
      prevAvg != null
        ? Number(((prevAvg * (pingCount - 1) + speed) / pingCount).toFixed(1))
        : speed;
  }

  await supabase
    .from("fleet_tracking_sessions")
    .update({
      ping_count: pingCount,
      max_speed_mph: speed != null && (prevMax == null || speed > prevMax) ? speed : prevMax,
      average_speed_mph: averageSpeedMph,
    })
    .eq("id", sessionId);
}
