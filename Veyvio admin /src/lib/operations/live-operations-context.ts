import type { DutyRecord } from '@/lib/api/types'
import { tripRouteWarning } from '@/lib/trips/trip-route'
import type { OperationalTrip } from '@/lib/transfers/types'
import type { LiveRunRow } from '@/lib/live/live-operations'

export type DriverAcknowledgementState = 'acknowledged' | 'pending' | 'not_required'

export function findTripForDuty(trips: OperationalTrip[], dutyId: string): OperationalTrip | null {
  return trips.find((t) => t.dutyId === dutyId) ?? null
}

export function driverAcknowledgementState(
  trip: OperationalTrip | null,
  duty?: DutyRecord | null,
): DriverAcknowledgementState {
  if (trip?.acknowledgedAt) return 'acknowledged'
  if (duty?.driverLifecycleStatus === 'acknowledged') return 'acknowledged'
  const requiresAck =
    Boolean(trip?.manifestVersion && trip.manifestVersion > 0) ||
    Boolean(duty?.acknowledgementRequired) ||
    trip?.assignmentStatus === 'accepted' ||
    trip?.assignmentStatus === 'assigned'
  if (!requiresAck) return 'not_required'
  return 'pending'
}

export function driverAcknowledgementLabel(state: DriverAcknowledgementState): string {
  switch (state) {
    case 'acknowledged':
      return 'Driver acknowledged'
    case 'pending':
      return 'Awaiting driver acknowledgement'
    default:
      return 'Acknowledgement not required'
  }
}

export function hasPendingRouteRevision(trip: OperationalTrip | null): boolean {
  if (!trip) return false
  return Boolean(tripRouteWarning(trip)?.toLowerCase().includes('acknowledge'))
}

export function buildLiveRunLinks(run: LiveRunRow, trip: OperationalTrip | null) {
  return {
    runHref: `/runs/${run.id}`,
    tripHref: trip ? `/trips/${trip.id}` : null,
    tripRouteHref: trip ? `/trips/${trip.id}?tab=route` : null,
    dispatchHref: `/dispatch?duty=${run.id}`,
    messagesHref: `/messages?compose=1&to=${encodeURIComponent(run.driverName)}&run=${encodeURIComponent(run.runReference)}`,
    exceptionsHref: `/exceptions?create=1&run=${encodeURIComponent(run.runReference)}`,
  }
}
