/**
 * Pure row-mapping for vehicle swap requests — zero imports so this module
 * is importable from both Deno (command-api) and plain Node (unit tests),
 * unlike vehicle-swap-workflow.ts which pulls in the Deno-only admin client.
 */
type Row = Record<string, unknown>

export function mapSwapRow(row: Row) {
  return {
    id: String(row.id),
    dutyId: String(row.duty_id),
    driverId: String(row.driver_id),
    currentVehicleId: String(row.current_vehicle_id),
    requestedVehicleId: String(row.requested_vehicle_id),
    reason: String(row.reason ?? ''),
    status: String(row.status ?? 'pending'),
    requestedAt: String(row.requested_at ?? ''),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    resolutionNotes: row.resolution_notes ? String(row.resolution_notes) : null,
  }
}
