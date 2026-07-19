import { Capacitor, registerPlugin } from "@capacitor/core";
import { buildActiveTripCompanion } from "@/lib/navigation/activeTripCompanion";

const DriverAndroidAuto = registerPlugin("DriverAndroidAuto");

export function isAndroidAutoBridgeSupported() {
  return Capacitor.getPlatform() === "android";
}

export async function updateAndroidAutoActiveTrip(companion) {
  if (!companion?.jobId || !isAndroidAutoBridgeSupported()) return { ok: false };

  try {
    await DriverAndroidAuto.updateActiveTrip({
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
    console.warn("[driverAndroidAuto] updateActiveTrip failed:", err);
    return { ok: false };
  }
}

export async function clearAndroidAutoActiveTrip() {
  if (!isAndroidAutoBridgeSupported()) return;
  try {
    await DriverAndroidAuto.clearActiveTrip();
  } catch (err) {
    console.warn("[driverAndroidAuto] clearActiveTrip failed:", err);
  }
}

export async function updateAndroidAutoForSession(session, { primaryAction = "open_app" } = {}) {
  if (!session) return { ok: false };
  const companion = buildActiveTripCompanion({
    jobId: session.jobId,
    jobRoute: session.jobRoute,
    leg: session.leg,
    destination: session.destination,
    primaryAction,
  });
  return updateAndroidAutoActiveTrip(companion);
}

export async function isAndroidAutoAvailable() {
  if (!isAndroidAutoBridgeSupported()) return false;
  try {
    const result = await DriverAndroidAuto.isAndroidAutoAvailable();
    return Boolean(result?.available);
  } catch {
    return false;
  }
}
