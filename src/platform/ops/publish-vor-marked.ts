import {
  createPlatformEvent,
  queuePlatformEventForConsumers,
} from "@veyvio/ops";

/** Emit `vehicle.vor.marked` so Dispatch blocks allocation until VOR clears. */
export function publishVehicleVorMarked(input: {
  companyId: string;
  depotId: string;
  actorId: string;
  vehicleId: string;
  vorCaseId: string;
  defectId?: string;
  reason: string;
  vehicleReg?: string;
}): void {
  const event = createPlatformEvent({
    eventType: "vehicle.vor.marked",
    tenantId: input.companyId,
    depotId: input.depotId,
    actorId: input.actorId,
    correlationId: input.vorCaseId,
    aggregateId: input.vehicleId,
    aggregateVersion: 1,
    payload: {
      vehicleId: input.vehicleId,
      vorCaseId: input.vorCaseId,
      defectId: input.defectId,
      reason: input.reason,
      vehicleReg: input.vehicleReg,
      dispatchBlock: true,
    },
  });
  queuePlatformEventForConsumers(event);
}
