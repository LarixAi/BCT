import type { DutyDetail } from "@/types/duty";
import { getMockDutyDetail, resetMockDutyStoreForTests } from "@/data/mocks/duties";
import { buildMockHomeSummary } from "@/data/mocks/home-summary";
import { useDriverStore } from "@/store/driver";
import { canSeedOperationalDemo } from "@/platform/dev/dev-guards";

/**
 * DEV only — reset duties back to start-of-day prep so the Duty Hub workflow is walkable again.
 */
export function resetDutyPrepDemo(dutyId: string): void {
  if (!canSeedOperationalDemo()) {
    console.warn("[veyvio] resetDutyPrepDemo is DEV-only");
    return;
  }

  resetMockDutyStoreForTests();
  const fresh = getMockDutyDetail(dutyId);
  if (!fresh) return;

  // Ensure React store holds the fresh mock (not a stale in_progress patch)
  const reset: DutyDetail = structuredClone(fresh);
  useDriverStore.getState().projectDuty(reset);
  useDriverStore.setState({
    activeDutyId: null,
    homeSummary: buildMockHomeSummary(),
  });
}
