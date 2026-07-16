import { getMockDutyDetail, syncMockDutyDetail } from "@/data/mocks/duties";
import { useDriverStore } from "@/store/driver";
import type { DutyDetail } from "@/types/duty";

/**
 * Patch duty in both the mock Map and Zustand so sheet prep stays walkable
 * even when outbox enqueue is skipped (missing session/tenancy).
 */
export function patchDutyLocal(
  dutyId: string,
  patch: Partial<DutyDetail> | ((duty: DutyDetail) => DutyDetail),
): DutyDetail | null {
  const current =
    useDriverStore.getState().dutyDetails[dutyId] ?? getMockDutyDetail(dutyId);
  if (!current) return null;

  const base = structuredClone(current);
  const next = typeof patch === "function" ? patch(base) : { ...base, ...patch };
  syncMockDutyDetail(next);
  useDriverStore.getState().updateDutyDetail(next);
  return next;
}
