/** Platform event payloads for Yard / Admin consumers (command-api). */

type Row = Record<string, unknown>;

export type HubPlatformEvent = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  tenantId: string;
  depotId: string;
  actorId: string;
  correlationId: string;
  aggregateId: string;
  aggregateVersion: number;
  payload: Record<string, unknown>;
  consumers: string[];
};

export function buildVehicleReturnedEvent(input: {
  companyId: string;
  depotId: string;
  actorId: string;
  vehicleId: string;
  registration?: string | null;
  bayLabel?: string | null;
  movementId: string;
  occurredAt: string;
  keysReturned?: boolean;
}): HubPlatformEvent {
  return {
    eventId: `vehicle.returned:${input.movementId}`,
    eventType: 'vehicle.returned',
    occurredAt: input.occurredAt,
    tenantId: input.companyId,
    depotId: input.depotId,
    actorId: input.actorId,
    correlationId: input.movementId,
    aggregateId: input.vehicleId,
    aggregateVersion: 1,
    payload: {
      vehicleId: input.vehicleId,
      registration: input.registration ?? null,
      bayLabel: input.bayLabel ?? null,
      movementId: input.movementId,
      keysReturned: input.keysReturned ?? true,
      source: 'driver_app',
    },
    consumers: ['yard', 'vehicles', 'audit'],
  };
}

export async function loadRecentVehicleReturnedEvents(
  admin: { from: (table: string) => Row },
  companyId: string,
  depotId: string | null,
): Promise<HubPlatformEvent[]> {
  if (!depotId) return [];
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from('yard_movements')
    .select('id, vehicle_id, registration_number, completed_at, to_location, note, reason, depot_id')
    .eq('company_id', companyId)
    .eq('depot_id', depotId)
    .gte('completed_at', since)
    .order('completed_at', { ascending: false })
    .limit(40);

  if (error) {
    console.warn('loadRecentVehicleReturnedEvents', error.message);
    return [];
  }

  return (data ?? [])
    .filter((row: Row) => {
      const reason = String(row.reason ?? '');
      const note = String(row.note ?? '');
      return reason === 'End of duty return' || note.includes('End of duty parking');
    })
    .map((row: Row) =>
      buildVehicleReturnedEvent({
        companyId,
        depotId: String(row.depot_id ?? depotId),
        actorId: 'driver',
        vehicleId: String(row.vehicle_id),
        registration: row.registration_number ? String(row.registration_number) : null,
        bayLabel: row.to_location ? String(row.to_location) : null,
        movementId: String(row.id),
        occurredAt: String(row.completed_at ?? new Date().toISOString()),
      }),
    );
}
