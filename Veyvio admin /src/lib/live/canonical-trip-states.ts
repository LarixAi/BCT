/** Shared trip lifecycle for Admin / Driver / backend alignment. */

export type TripLifecycleState =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'RELEASED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKUP_IN_PROGRESS'
  | 'PASSENGER_ONBOARD'
  | 'EN_ROUTE_TO_DROPOFF'
  | 'ARRIVED_AT_DROPOFF'
  | 'HANDOVER_IN_PROGRESS'
  | 'COMPLETED'

export type TripExceptionState =
  | 'AT_RISK'
  | 'DELAYED'
  | 'PAUSED'
  | 'BLOCKED'
  | 'FAILED_PICKUP'
  | 'FAILED_HANDOVER'
  | 'CANCELLED'
  | 'ABORTED'

export type LiveServiceHealth = 'on_time' | 'at_risk' | 'late' | 'severely_late' | 'blocked' | 'completed'

export type LiveDriverState =
  | 'NOT_SIGNED_ON'
  | 'READY'
  | 'PREPARING_VEHICLE'
  | 'AVAILABLE'
  | 'TRAVELLING'
  | 'AT_PICKUP'
  | 'BOARDING'
  | 'DRIVING_WITH_PASSENGER'
  | 'AT_DROP_OFF'
  | 'ON_BREAK'
  | 'RETURNING'
  | 'SIGNED_OFF'
  | 'OFFLINE'
  | 'ASSISTANCE_REQUESTED'

export type LiveVehicleState =
  | 'IN_YARD'
  | 'READY'
  | 'ALLOCATED'
  | 'IN_SERVICE'
  | 'WAITING'
  | 'RETURNING'
  | 'RESTRICTED'
  | 'DEFECT_REPORTED'
  | 'VOR'
  | 'LOCATION_UNAVAILABLE'

export type LiveExceptionSeverity = 'critical' | 'urgent' | 'warning'

export type LiveExceptionLifecycle =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED'

const TRIP_LABELS: Record<TripLifecycleState, string> = {
  PLANNED: 'Planned',
  ASSIGNED: 'Assigned',
  RELEASED: 'Released',
  EN_ROUTE_TO_PICKUP: 'En route to pickup',
  ARRIVED_AT_PICKUP: 'Arrived at pickup',
  PICKUP_IN_PROGRESS: 'Pickup in progress',
  PASSENGER_ONBOARD: 'Passenger onboard',
  EN_ROUTE_TO_DROPOFF: 'Travelling to drop-off',
  ARRIVED_AT_DROPOFF: 'Arrived at drop-off',
  HANDOVER_IN_PROGRESS: 'Handover in progress',
  COMPLETED: 'Completed',
}

const HEALTH_LABELS: Record<LiveServiceHealth, string> = {
  on_time: 'On time',
  at_risk: 'At risk',
  late: 'Late',
  severely_late: 'Severely late',
  blocked: 'Blocked',
  completed: 'Completed',
}

export function labelTripLifecycle(state: TripLifecycleState): string {
  return TRIP_LABELS[state]
}

export function labelServiceHealth(health: LiveServiceHealth): string {
  return HEALTH_LABELS[health]
}

/** Map loose live-dispatch / duty status strings into trip lifecycle. */
export function mapTripLifecycle(raw: string | null | undefined): TripLifecycleState {
  const s = (raw ?? '').toLowerCase().replace(/-/g, '_')
  if (['completed', 'complete', 'done'].includes(s)) return 'COMPLETED'
  if (['passenger_boarded', 'onboard', 'passenger_onboard'].includes(s)) return 'PASSENGER_ONBOARD'
  if (['arrived_pickup', 'arrived_at_pickup', 'at_pickup'].includes(s)) return 'ARRIVED_AT_PICKUP'
  if (['arrived_dropoff', 'arrived_at_dropoff', 'at_dropoff'].includes(s)) return 'ARRIVED_AT_DROPOFF'
  if (['handover', 'handover_in_progress'].includes(s)) return 'HANDOVER_IN_PROGRESS'
  if (['en_route_dropoff', 'to_dropoff'].includes(s)) return 'EN_ROUTE_TO_DROPOFF'
  if (['in_progress', 'en_route', 'en_route_to_pickup', 'active', 'assigned'].includes(s)) {
    return s === 'assigned' ? 'ASSIGNED' : 'EN_ROUTE_TO_PICKUP'
  }
  if (['released', 'ready'].includes(s)) return 'RELEASED'
  if (['planned', 'scheduled'].includes(s)) return 'PLANNED'
  return 'ASSIGNED'
}

export function mapServiceHealth(input: {
  status?: string | null
  delayMinutes?: number
  isStale?: boolean
  blocked?: boolean
}): LiveServiceHealth {
  if (input.blocked) return 'blocked'
  const s = (input.status ?? '').toLowerCase()
  if (['completed', 'complete'].includes(s)) return 'completed'
  const delay = input.delayMinutes ?? 0
  if (delay >= 20) return 'severely_late'
  if (delay >= 8 || s.includes('late')) return 'late'
  if (delay >= 4 || input.isStale || s.includes('risk')) return 'at_risk'
  return 'on_time'
}

export function mapLiveDriverState(input: {
  status?: string | null
  isStale?: boolean
  noGps?: boolean
  passengerOnboard?: boolean
  assistance?: boolean
}): LiveDriverState {
  if (input.assistance) return 'ASSISTANCE_REQUESTED'
  // Stale GPS means the device went quiet after reporting — not the same as never reporting.
  if (input.isStale && !input.noGps) return 'OFFLINE'
  if (input.passengerOnboard) return 'DRIVING_WITH_PASSENGER'
  const s = (input.status ?? '').toLowerCase().replace(/-/g, '_')
  if (['on_break', 'break'].includes(s)) return 'ON_BREAK'
  if (['at_pickup', 'arrived_at_pickup'].includes(s)) return 'AT_PICKUP'
  if (['signed_off', 'off_duty', 'completed'].includes(s)) return 'SIGNED_OFF'
  if (['in_progress', 'en_route', 'active', 'on_trip'].includes(s)) return 'TRAVELLING'
  if (['assigned', 'signed_on', 'on_duty', 'ready'].includes(s)) return 'AVAILABLE'
  return 'AVAILABLE'
}

export function mapLiveVehicleState(input: {
  status?: string | null
  isStale?: boolean
  noGps?: boolean
}): LiveVehicleState {
  if (input.noGps) return 'LOCATION_UNAVAILABLE'
  const s = (input.status ?? '').toLowerCase()
  if (s === 'vor' || s === 'off_road') return 'VOR'
  if (s.includes('restrict') || s.includes('defect')) return s.includes('vor') ? 'VOR' : 'RESTRICTED'
  if (['in_progress', 'assigned', 'in_service', 'active'].some((x) => s.includes(x))) return 'IN_SERVICE'
  return 'ALLOCATED'
}
