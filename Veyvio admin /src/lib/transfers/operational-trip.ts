import type { DutyRecord } from '@/lib/api/types'
import type { OperationalPosition, OperationalTrip, OperationalTripStatus } from './types'

const DUTY_STATUS_TO_TRIP: Record<string, OperationalTripStatus> = {
  planned: 'planned',
  assigned: 'assigned',
  accepted: 'accepted',
  signed_on: 'released',
  in_progress: 'in_progress',
  passenger_boarded: 'in_progress',
  en_route: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  unassigned: 'planned',
}

/** Build a board-safe trip when Command has a duty but no passenger trip package yet. */
export function synthesizeOperationalTripFromDuty(duty: DutyRecord): OperationalTrip {
  const driverName = duty.driver
    ? `${duty.driver.firstName} ${duty.driver.lastName}`.trim()
    : null
  const status = DUTY_STATUS_TO_TRIP[duty.status] ?? 'assigned'

  return {
    id: duty.id,
    reference: duty.reference,
    dutyId: duty.id,
    runReference: duty.reference,
    status,
    driverId: duty.driver?.id ?? null,
    driverName,
    vehicleId: duty.vehicle?.id ?? null,
    vehicleRegistration: duty.vehicle?.registrationNumber ?? null,
    depotId: null,
    depotName: null,
    assignmentStatus: duty.driver ? 'assigned' : 'unassigned',
    acceptedAt: null,
    acknowledgedAt: null,
    manifestVersion: duty.version ?? 1,
    lastAppSync: null,
    delayMinutes: 0,
    passengersOnboard: 0,
    completedJobCount: 0,
    totalJobCount: 0,
    activeJobId: null,
    jobs: [],
    gpsLat: null,
    gpsLng: null,
    driverOnline: false,
    routeName: duty.route?.name ?? null,
  }
}

export function deriveOperationalPosition(trip: OperationalTrip): OperationalPosition {
  const jobs = trip.jobs ?? []
  return {
    trip: { ...trip, jobs },
    completedJobs: jobs.filter((j) => j.status === 'completed'),
    activeJob: jobs.find((j) => j.id === trip.activeJobId) ?? jobs.find((j) => j.status === 'onboard') ?? null,
    remainingJobs: jobs.filter((j) => j.status === 'unstarted' || j.status === 'waiting'),
    onboardPassengers: jobs.filter((j) => j.status === 'onboard'),
  }
}

export function isOperationalTripLike(value: unknown): value is OperationalTrip {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.reference === 'string'
}

export function isOperationalPositionLike(value: unknown): value is OperationalPosition {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return isOperationalTripLike(row.trip)
}
