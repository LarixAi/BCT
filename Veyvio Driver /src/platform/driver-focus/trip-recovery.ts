import { getMockDutyDetail } from "@/data/mocks/duties";
import { useDriverStore } from "@/store/driver";
import type { ActiveTripSnapshot } from "@/types/active-trip";
import {
  isSnapshotRecoverable,
  readLatestActiveTripSnapshot,
} from "./active-trip-snapshot";

export interface TripRecoveryResult {
  recovered: boolean;
  snapshot: ActiveTripSnapshot | null;
  message?: string;
}

export async function recoverActiveTripFromSnapshot(): Promise<TripRecoveryResult> {
  const snapshot = await readLatestActiveTripSnapshot();
  if (!snapshot || !isSnapshotRecoverable(snapshot)) {
    return { recovered: false, snapshot: null };
  }

  const store = useDriverStore.getState();
  const existing = store.getDuty(snapshot.dutyId);
  if (!existing) {
    const mockDuty = getMockDutyDetail(snapshot.dutyId);
    if (mockDuty.lifecycleStatus === "completed") {
      return { recovered: false, snapshot };
    }
    store.updateDutyDetail(mockDuty);
  }

  if (!store.activeDutyId) {
    store.setActiveDuty(snapshot.dutyId);
    void store.loadDuty(snapshot.dutyId);
  }

  return {
    recovered: true,
    snapshot,
    message: "Active trip restored from local snapshot",
  };
}
