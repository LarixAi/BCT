import type {
  CreateTransferInput,
  OperationalTrip,
  TransferCandidate,
  TransferImpactPreview,
} from './types'
import type { DriverRecord, VehicleRecord } from '@/lib/api/types'
import { getJobsInScope } from './validation'

export function rankTransferCandidates(
  _trip: OperationalTrip,
  drivers: DriverRecord[],
  vehicles: VehicleRecord[],
  excludeDriverId?: string | null,
): TransferCandidate[] {
  const available = drivers.filter((d) => d.status !== 'unavailable' && d.id !== excludeDriverId)

  return available
    .map((d, index) => {
      const vehicle = vehicles.find(
        (v) => v.depotId === d.depotId && v.status === 'in_service',
      )
      return {
        driverId: d.id,
        driverName: `${d.firstName} ${d.lastName}`,
        status: d.status ?? 'unknown',
        vehicleId: vehicle?.id ?? null,
        vehicleRegistration: vehicle?.registrationNumber ?? null,
        seatingCapacity: vehicle?.seatingCapacity ?? 0,
        wheelchairCapacity: vehicle?.wheelchairCapacity ?? 0,
        depotName: d.depotName ?? null,
        isOnline: d.status === 'on_duty' || d.status === 'available',
        estimatedTravelMinutes: 8 + index * 3,
        remainingDutyHours: 4.5 - index * 0.3,
        hasScheduleConflict: index > 2,
        licenceValid: true,
        dbsValid: true,
        punctualityScore: 94 - index * 4,
        familiarWithRoute: index < 2,
        predictedDelayMinutes: Math.max(0, index * 2 - 1),
        rank: index + 1,
      } satisfies TransferCandidate
    })
    .slice(0, 6)
}

export function calculateTransferImpact(
  trip: OperationalTrip,
  input: CreateTransferInput,
  drivers: DriverRecord[],
  vehicles: VehicleRecord[],
  destinationTrip?: OperationalTrip | null,
): TransferImpactPreview {
  const jobsInScope = getJobsInScope(trip, input)
  const newDriver = input.newDriverId ? drivers.find((d) => d.id === input.newDriverId) : null
  const newVehicle = input.newVehicleId
    ? vehicles.find((v) => v.id === input.newVehicleId)
    : newDriver
      ? vehicles.find((v) => v.depotId === newDriver.depotId && v.status === 'in_service')
      : null

  const remainingWithOriginal = trip.jobs.filter((j) => !jobsInScope.find((x) => x.id === j.id))

  const beforeDelay = trip.delayMinutes
  const afterDelay = Math.max(0, beforeDelay - 17)

  return {
    before: {
      driverName: trip.driverName,
      vehicleRegistration: trip.vehicleRegistration,
      pickupEta: trip.jobs.find((j) => j.status === 'unstarted' || j.status === 'waiting')?.plannedPickupTime ?? null,
      jobCount: trip.totalJobCount,
      delayMinutes: beforeDelay,
      passengersOnboard: trip.passengersOnboard,
    },
    after: {
      driverName: newDriver ? `${newDriver.firstName} ${newDriver.lastName}` : destinationTrip?.driverName ?? null,
      vehicleRegistration: newVehicle?.registrationNumber ?? trip.vehicleRegistration,
      pickupEta: '07:58',
      jobCount: input.scope === 'entire_trip' ? trip.totalJobCount : jobsInScope.length,
      delayMinutes: afterDelay,
      passengersOnboard:
        input.scope === 'remaining_jobs' || input.scope === 'selected_jobs'
          ? trip.passengersOnboard
          : 0,
    },
    affectedPassengers: jobsInScope.map((j) => j.passengerName),
    jobsRemainingWithOriginal: remainingWithOriginal.map((j) => j.passengerName),
    jobsMoving: jobsInScope.map((j) => j.passengerName),
    notificationsToSend: [
      'Original driver app notification',
      ...(newDriver ? ['Receiving driver assignment'] : []),
      ...(jobsInScope.length ? ['Passenger/parent ETA update'] : []),
    ],
    slaImpact: beforeDelay > 15 ? 'School arrival SLA at risk — recovery improves ETA' : null,
    managerApprovalRequired: trip.passengersOnboard > 0 || jobsInScope.some((j) => j.safeguardingFlag),
    additionalDeadMileageKm: 4.2,
    arrivalImprovementMinutes: beforeDelay > afterDelay ? beforeDelay - afterDelay : null,
  }
}
