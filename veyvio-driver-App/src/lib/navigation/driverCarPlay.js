import { Capacitor, registerPlugin } from "@capacitor/core";
import { buildActiveTripCompanion } from "@/lib/navigation/activeTripCompanion";

const DriverCarPlay = registerPlugin("DriverCarPlay");

export function isCarPlayBridgeSupported() {
  return Capacitor.getPlatform() === "ios";
}

export async function updateCarPlayActiveTrip(companion) {
  if (!companion?.jobId || !isCarPlayBridgeSupported()) return { ok: false };

  try {
    await DriverCarPlay.updateActiveTrip({
      jobId: companion.jobId,
      jobRoute: companion.jobRoute ?? `/job/${companion.jobId}`,
      leg: companion.leg,
      primaryAction: companion.primaryAction ?? "open_app",
      label: companion.label,
      destinationLat: companion.destinationLat,
      destinationLng: companion.destinationLng,
    });
    return { ok: true };
  } catch (err) {
    console.warn("[driverCarPlay] updateActiveTrip failed:", err);
    return { ok: false };
  }
}

export async function clearCarPlayActiveTrip() {
  if (!isCarPlayBridgeSupported()) return;
  try {
    await DriverCarPlay.clearActiveTrip();
  } catch (err) {
    console.warn("[driverCarPlay] clearActiveTrip failed:", err);
  }
}

export async function updateCarPlayForSession(session, { primaryAction = "open_app" } = {}) {
  if (!session) return { ok: false };
  const companion = buildActiveTripCompanion({
    jobId: session.jobId,
    jobRoute: session.jobRoute,
    leg: session.leg,
    destination: session.destination,
    primaryAction,
  });
  return updateCarPlayActiveTrip(companion);
}

export async function isCarPlayAvailable() {
  if (!isCarPlayBridgeSupported()) return false;
  try {
    const result = await DriverCarPlay.isCarPlayAvailable();
    return Boolean(result?.available);
  } catch {
    return false;
  }
}
