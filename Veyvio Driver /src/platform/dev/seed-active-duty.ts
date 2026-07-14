import type { DutyDetail } from "@/types/duty";
import { useDriverStore } from "@/store/driver";
import { buildActiveJourneyHomeSummary } from "@/data/mocks/home-summary";
import { syncMockDutyDetail } from "@/data/mocks/duties";
import { canSeedOperationalDemo } from "@/platform/dev/dev-guards";

/** Dev/e2e fixture boot — never a production write path. */
export function seedActiveDutyDemo(dutyId: string) {
  if (!canSeedOperationalDemo()) {
    console.warn("[veyvio] Ignoring operational demo seed outside DEV");
    return;
  }
  const store = useDriverStore.getState();
  const duty = store.getDuty(dutyId);
  if (!duty) return;

  const patched: DutyDetail = {
    ...duty,
    lifecycleStatus: "in_progress",
    clockedInAt: duty.clockedInAt ?? "2026-07-12T06:40:00.000Z",
    fitForDutyDeclaredAt: duty.fitForDutyDeclaredAt ?? "2026-07-12T06:40:00.000Z",
    startedAt: duty.startedAt ?? "2026-07-12T06:41:00.000Z",
    vehicleCheck: {
      ...duty.vehicleCheck,
      status: "cleared",
      canStartDuty: true,
      vehicleId: duty.vehicle?.id,
    },
    runs: duty.runs.map((run, i) =>
      i === 0
        ? {
            ...run,
            status: "active",
            stops: run.stops.map((stop, si) => ({
              ...stop,
              status: si === 0 ? "completed" : si === 1 ? "approaching" : stop.status,
            })),
          }
        : run,
    ),
  };

  // Fixture boot may update mock Map + projection together (DEV only)
  syncMockDutyDetail(patched);
  store.projectDuty(patched);
  useDriverStore.setState({
    activeDutyId: dutyId,
    homeSummary: buildActiveJourneyHomeSummary(),
  });
}
