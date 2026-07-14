import type { ActiveTripSnapshot } from "@/types/active-trip";
import type { TripOverlayPayload } from "./adapters/stub-adapters";
import {
  clearActiveTripSnapshot,
  loadLatestActiveTripSnapshot,
  saveActiveTripSnapshot,
} from "@/platform/storage/local-db";

export async function persistActiveTripSnapshot(
  payload: TripOverlayPayload,
  meta: Pick<ActiveTripSnapshot, "workflow" | "dutyLifecycleStatus"> & {
    latitude?: number;
    longitude?: number;
  },
): Promise<void> {
  const snapshot: ActiveTripSnapshot = {
    dutyId: payload.dutyId,
    workflow: meta.workflow,
    tripStateLabel: payload.tripStateLabel,
    nextStopStreet: payload.nextStopLabel,
    etaLabel: payload.etaLabel,
    distanceLabel: payload.distanceLabel,
    passengerProgressLabel: payload.passengerProgressLabel,
    accessibilityIndicator: payload.accessibilityIndicator,
    hasNewInstruction: payload.hasNewInstruction,
    latitude: meta.latitude,
    longitude: meta.longitude,
    dutyLifecycleStatus: meta.dutyLifecycleStatus,
    recordedAt: new Date().toISOString(),
  };
  await saveActiveTripSnapshot(snapshot);
}

export async function readLatestActiveTripSnapshot(): Promise<ActiveTripSnapshot | null> {
  return loadLatestActiveTripSnapshot<ActiveTripSnapshot>();
}

export async function removeActiveTripSnapshot(dutyId: string): Promise<void> {
  await clearActiveTripSnapshot(dutyId);
}

export function snapshotToOverlayPayload(snapshot: ActiveTripSnapshot): TripOverlayPayload {
  return {
    dutyId: snapshot.dutyId,
    tripStateLabel: snapshot.tripStateLabel,
    nextStopLabel: snapshot.nextStopStreet,
    etaLabel: snapshot.etaLabel,
    distanceLabel: snapshot.distanceLabel,
    passengerProgressLabel: snapshot.passengerProgressLabel,
    accessibilityIndicator: snapshot.accessibilityIndicator,
    hasNewInstruction: snapshot.hasNewInstruction,
  };
}

export function isSnapshotRecoverable(snapshot: ActiveTripSnapshot): boolean {
  if (snapshot.dutyLifecycleStatus === "completed" || snapshot.dutyLifecycleStatus === "cancelled") {
    return false;
  }
  const ageMs = Date.now() - new Date(snapshot.recordedAt).getTime();
  return ageMs < 24 * 60 * 60 * 1000;
}
