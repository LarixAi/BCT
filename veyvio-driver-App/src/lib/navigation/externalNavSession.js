import { hideFloatingBubble } from "@/lib/navigation/floatingBubble";
import { clearInCarActiveTrip } from "@/lib/navigation/activeTripInCar";

const STORAGE_KEY = "csf_external_nav_session";

/** @typedef {{ destination: { latitude: number, longitude: number, label?: string }, jobId?: string, jobRoute?: string, leg?: string, startedAt: string, bubbleEnabled?: boolean }} ExternalNavSession */

export function startExternalNavSession({ destination, jobId, jobRoute, leg = "pickup" }) {
  if (!destination?.latitude || !destination?.longitude) return null;

  /** @type {ExternalNavSession} */
  const session = {
    destination: {
      latitude: destination.latitude,
      longitude: destination.longitude,
      label: destination.label ?? "pickup",
    },
    jobId: jobId ?? null,
    jobRoute: jobRoute ?? (jobId ? `/job/${jobId}` : null),
    leg,
    startedAt: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota errors */
  }
  return session;
}

export function loadExternalNavSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.destination?.latitude || !parsed?.destination?.longitude) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearExternalNavSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  void hideFloatingBubble();
  void clearInCarActiveTrip();
}

export function isExternalNavActive() {
  return loadExternalNavSession() != null;
}
