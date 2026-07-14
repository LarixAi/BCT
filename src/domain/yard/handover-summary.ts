import { kpiCounts } from "@/domain/yard/kpi";
import type { Defect, ShiftHandoverSummary, Trip, VorCase } from "@/types/yard";

export function buildHandoverSummary(
  vehicles: Parameters<typeof kpiCounts>[0],
  trips: Trip[],
  defects: Defect[],
  vorCases: VorCase[],
): ShiftHandoverSummary {
  const kpi = kpiCounts(vehicles);
  const ready = trips.filter(t => t.ready);
  const blocked = trips.filter(t => !t.ready);
  const released = trips.filter(t => t.releasedAt);

  return {
    vehicleCount: vehicles.length,
    available: kpi.available,
    vor: kpi.vor,
    awaitingCheck: kpi.awaiting,
    onDepartureLine: kpi.onLine,
    inWorkshop: kpi.workshop,
    offSite: kpi.offSite,
    openDefects: defects.filter(d => !d.resolved).length,
    activeVorCases: vorCases.filter(c => c.lifecycle !== "Cleared").length,
    tripsReady: ready.length,
    tripsBlocked: blocked.length,
    tripsReleased: released.length,
    blockedTripCodes: blocked.map(t => t.code),
  };
}
