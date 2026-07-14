import type { VehicleProfile } from '@/lib/vehicles/types'
import type { OperationalTrip } from '@/lib/transfers/types'
import type { OperationalImpactSummary } from './types'

export function buildOperationalImpact(vehicle: VehicleProfile, trip: OperationalTrip | null): OperationalImpactSummary {
  const wheelchairRequired = trip?.jobs.some((j) => j.wheelchairRequired) ?? vehicle.wheelchairCapacity > 0
  const passengerCount = trip?.jobs.filter((j) => j.status !== 'completed').length ?? 0
  const safeguarding = trip?.jobs.some((j) => j.safeguardingFlag) ?? false

  return {
    hasAssignedWork: !!(vehicle.currentRunReference || vehicle.nextRunReference || trip),
    currentRunReference: vehicle.currentRunReference ?? trip?.runReference ?? null,
    nextRunReference: vehicle.nextRunReference ?? null,
    nextDepartureTime: vehicle.nextDepartureTime,
    assignedDriverName: vehicle.currentDriverName ?? vehicle.nextDriverName ?? trip?.driverName ?? null,
    routeName: trip?.routeName ?? null,
    tripId: trip?.id ?? null,
    tripStatus: trip?.status ?? null,
    passengerCommitments: passengerCount,
    wheelchairRequired,
    minSeatingCapacity: vehicle.seatingCapacity,
    safeguardingPassengers: safeguarding,
    depotName: vehicle.currentDepotName,
    operationalImpact: vehicle.operationalStatus === 'vor' || vehicle.criticalDefectCount > 0
      ? 'Vehicle blocked — run may need replacement'
      : vehicle.checksOverdue
        ? 'Departure at risk — check not completed'
        : null,
  }
}
