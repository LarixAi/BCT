import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { commandPostDriverLocation } from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  dequeueFleetPing,
  enqueueFleetPing,
  loadFleetPingQueue,
} from "@/lib/fleet-tracking-queue.storage";
import { analyseDrivingPing } from "@/services/fleet-behaviour.service";
import { lookupSpeedLimitMph } from "@/services/fleet-speed-limit.service";
import {
  ensureFleetSessionForOpenShift,
  getActiveFleetSession,
  incrementSessionPingStats,
} from "@/services/fleet-tracking.service";

const PING_INTERVAL_MS = 30_000;

async function postLocationToCommand({
  dutyId,
  vehicleId,
  latitude,
  longitude,
  accuracyMeters,
  heading,
  speedMph,
}) {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, message: "Not signed in" };

    const speedMps =
      typeof speedMph === "number" && Number.isFinite(speedMph) ? speedMph / 2.237 : null;

    return await commandPostDriverLocation(token, {
      dutyId: dutyId || undefined,
      vehicleId: vehicleId || undefined,
      latitude,
      longitude,
      accuracyMeters,
      heading,
      speedMps,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Command location failed" };
  }
}

export async function sendDriverLocationPing({
  organisationId,
  driverId,
  vehicleId,
  jobId,
  sessionId,
  latitude,
  longitude,
  accuracyMeters,
  speedMph,
  heading,
  batteryLevel,
  appState,
  speedLimitMph,
}) {
  if (!driverId) return { ok: false, message: "Missing driver context" };
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, message: "Invalid coordinates" };
  }

  const payload = {
    organisation_id: organisationId ?? null,
    driver_id: driverId,
    vehicle_id: vehicleId ?? null,
    job_id: jobId ?? null,
    session_id: sessionId ?? null,
    latitude,
    longitude,
    accuracy_meters: accuracyMeters ?? null,
    speed_mph: speedMph ?? null,
    heading: heading ?? null,
    battery_level: batteryLevel ?? null,
    app_state: appState ?? "foreground",
    speed_limit_mph: speedLimitMph ?? null,
    source: "driver_app",
    recorded_at: new Date().toISOString(),
  };

  const commandResult = await postLocationToCommand({
    dutyId: jobId,
    vehicleId,
    latitude,
    longitude,
    accuracyMeters,
    heading,
    speedMph,
  });

  let legacyError = null;
  if (organisationId) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("driver_location_pings").insert(payload);
    legacyError = error;
  }

  if (legacyError && !commandResult.ok) {
    enqueueFleetPing(driverId, payload);
    return {
      ok: false,
      message: commandResult.message || legacyError.message,
      queued: true,
    };
  }

  if (sessionId) {
    await incrementSessionPingStats(sessionId, speedMph);
  }

  // Command Live Ops is the source of truth when the legacy ping table is missing.
  if (commandResult.ok) return { ok: true, via: "command" };
  if (legacyError) return { ok: false, message: legacyError.message };
  return { ok: true };
}

export async function flushFleetPingQueue(driverId) {
  const queue = loadFleetPingQueue(driverId);
  if (queue.length === 0) return { flushed: 0 };

  const supabase = getSupabaseClient();
  let flushed = 0;

  for (const item of queue) {
    const commandResult = await postLocationToCommand({
      dutyId: item.payload.job_id,
      vehicleId: item.payload.vehicle_id,
      latitude: item.payload.latitude,
      longitude: item.payload.longitude,
      accuracyMeters: item.payload.accuracy_meters,
      heading: item.payload.heading,
      speedMph: item.payload.speed_mph,
    });
    const { error } = await supabase.from("driver_location_pings").insert(item.payload);
    if (error && !commandResult.ok) break;
    dequeueFleetPing(driverId, item.id);
    flushed += 1;
    if (item.payload.session_id) {
      await incrementSessionPingStats(item.payload.session_id, item.payload.speed_mph);
    }
  }

  return { flushed };
}

async function readCurrentPosition() {
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") return null;
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000 });
    return pos;
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
  });
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

function detectAppState() {
  if (typeof document === "undefined") return "foreground";
  return document.visibilityState === "visible" ? "foreground" : "background";
}

/**
 * Start periodic GPS pings for an active duty.
 * Always posts to Command Live Ops; legacy fleet session is optional.
 */
export function startFleetTrackingPings({ driver, active, onPing, dutyId = null }) {
  if (!active || !driver?.id) {
    return () => {};
  }

  let cancelled = false;

  const sendPing = async () => {
    if (cancelled) return;

    let session = await getActiveFleetSession(driver);
    if (!session) {
      session = await ensureFleetSessionForOpenShift(driver);
    }
    if (cancelled) return;

    await flushFleetPingQueue(driver.id);

    const pos = await readCurrentPosition();
    if (!pos || cancelled) {
      if (!cancelled) {
        onPing?.({
          ok: false,
          message: "Location unavailable — allow GPS in your browser or device settings.",
        });
      }
      return;
    }

    const speedMs = pos.coords.speed;
    const speedMph =
      typeof speedMs === "number" && Number.isFinite(speedMs)
        ? Number((speedMs * 2.237).toFixed(1))
        : null;

    const batteryLevel = await readBatteryLevel();
    const lat = Number(pos.coords.latitude.toFixed(6));
    const lng = Number(pos.coords.longitude.toFixed(6));
    const organisationId = session?.organisationId ?? driver.organisationId ?? driver.companyId;
    const speedLimitMph = organisationId
      ? await lookupSpeedLimitMph(organisationId, lat, lng)
      : null;

    if (session) {
      await analyseDrivingPing({
        session,
        driver,
        latitude: lat,
        longitude: lng,
        speedMph,
        heading: pos.coords.heading ?? null,
        speedLimitMph,
      });
    }

    const result = await sendDriverLocationPing({
      organisationId,
      driverId: driver.id,
      vehicleId: session?.vehicleId ?? driver.vehicleId ?? null,
      jobId: dutyId ?? session?.jobId ?? null,
      sessionId: session?.id ?? null,
      latitude: lat,
      longitude: lng,
      accuracyMeters: Math.round(pos.coords.accuracy ?? 0),
      speedMph,
      heading: pos.coords.heading ?? null,
      batteryLevel,
      appState: detectAppState(),
      speedLimitMph,
    });

    onPing?.({
      speedMph,
      speedLimitMph,
      accuracyMeters: Math.round(pos.coords.accuracy ?? 0),
      batteryLevel,
      recordedAt: new Date().toISOString(),
      ok: result.ok,
      message: result.message,
    });
  };

  const initialTimer = window.setTimeout(() => {
    void sendPing();
  }, 3_000);
  const interval = window.setInterval(() => {
    void sendPing();
  }, PING_INTERVAL_MS);

  const onlineHandler = () => {
    void flushFleetPingQueue(driver.id);
  };
  window.addEventListener("online", onlineHandler);

  return () => {
    cancelled = true;
    window.clearTimeout(initialTimer);
    window.clearInterval(interval);
    window.removeEventListener("online", onlineHandler);
  };
}

/** @deprecated Use startFleetTrackingPings with duty session instead. */
export function startDriverJobLocationPing({
  organisationId,
  driverId,
  vehicleId,
  jobId,
  active,
}) {
  if (!active || !organisationId || !driverId || !jobId) {
    return () => {};
  }

  let cancelled = false;

  const sendPing = async () => {
    if (cancelled) return;
    const pos = await readCurrentPosition();
    if (!pos || cancelled) return;

    const speedMs = pos.coords.speed;
    const speedMph =
      typeof speedMs === "number" && Number.isFinite(speedMs)
        ? Number((speedMs * 2.237).toFixed(1))
        : null;

    await sendDriverLocationPing({
      organisationId,
      driverId,
      vehicleId,
      jobId,
      latitude: Number(pos.coords.latitude.toFixed(6)),
      longitude: Number(pos.coords.longitude.toFixed(6)),
      accuracyMeters: Math.round(pos.coords.accuracy ?? 0),
      speedMph,
      heading: pos.coords.heading ?? null,
    });
  };

  const initialTimer = window.setTimeout(() => void sendPing(), 5_000);
  const interval = window.setInterval(() => void sendPing(), 60_000);

  return () => {
    cancelled = true;
    window.clearTimeout(initialTimer);
    window.clearInterval(interval);
  };
}

export async function readCurrentSpeedMph() {
  const pos = await readCurrentPosition();
  if (!pos) return { speedMph: null, accuracyMeters: null };
  const speedMs = pos.coords.speed;
  const speedMph =
    typeof speedMs === "number" && Number.isFinite(speedMs)
      ? Number((speedMs * 2.237).toFixed(1))
      : null;
  return {
    speedMph,
    accuracyMeters: Math.round(pos.coords.accuracy ?? 0),
  };
}
