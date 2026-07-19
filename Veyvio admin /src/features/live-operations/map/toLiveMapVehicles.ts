import type { LiveDispatchVehicle } from '@/lib/api/types'
import type { LiveServiceHealth } from '@/lib/live/canonical-trip-states'
import type { LiveRunRow } from '@/lib/live/live-operations'
import type { LiveVehicle, VehicleOperationalStatus } from './LiveOperationsMap'

function healthToMapStatus(health: LiveServiceHealth | undefined, isStale: boolean): VehicleOperationalStatus {
  if (isStale) return 'OFFLINE'
  switch (health) {
    case 'at_risk':
      return 'AT_RISK'
    case 'late':
    case 'severely_late':
      return 'LATE'
    case 'blocked':
      return 'BLOCKED'
    case 'on_time':
    case 'completed':
      return 'ON_TIME'
    default:
      return 'ON_TIME'
  }
}

/** Map live dispatch vehicles + run health into Command map markers. */
export function toLiveMapVehicles(
  vehicles: LiveDispatchVehicle[],
  runs: LiveRunRow[],
  options?: { staleOnly?: boolean },
): LiveVehicle[] {
  const healthByDuty = new Map(runs.map((run) => [run.id, run.health]))

  return vehicles
    .filter((vehicle) => {
      if (vehicle.lastLatitude == null || vehicle.lastLongitude == null) return false
      if (options?.staleOnly && !vehicle.isStale) return false
      return true
    })
    .map((vehicle) => {
      const registration = vehicle.vehicleRegistration ?? vehicle.reference
      return {
        id: vehicle.dutyId,
        registration,
        driverName: vehicle.driverName ?? undefined,
        runReference: vehicle.reference,
        latitude: vehicle.lastLatitude!,
        longitude: vehicle.lastLongitude!,
        status: healthToMapStatus(healthByDuty.get(vehicle.dutyId), vehicle.isStale),
        lastUpdatedAt: vehicle.lastPositionAt ?? new Date().toISOString(),
      }
    })
}
