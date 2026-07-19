import type { DutyDetailRecord, RouteStopRecord } from '@/lib/api/types'
import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'
import { buildWorkspace } from './build-sequence'
import type { JourneySequenceWorkspace } from './types'

function stopTime(stop: RouteStopRecord): string | null {
  const raw = stop.pickupTime ?? stop.dropoffTime ?? null
  if (!raw) return null
  if (raw.includes('T')) return raw.slice(11, 16)
  return raw.slice(0, 5)
}

function timeFromDutyField(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(0, 5)
}

function isDropStop(stop: RouteStopRecord): boolean {
  const label = `${stop.name ?? ''} ${stop.address ?? ''}`
  return /drop|school|destination|hub|centre|center|primary|academy/i.test(label)
}

function passengerLabel(stop: RouteStopRecord, index: number): string {
  const name = stop.name ?? ''
  if (name.includes('—')) return name.split('—').pop()!.trim()
  if (name.includes(' - ')) return name.split(' - ').pop()!.trim()
  return name || `Passenger ${index + 1}`
}

/** Build a synthetic operational trip from duty route stops when no ops trip jobs exist. */
export function dutyToSyntheticTrip(duty: DutyDetailRecord): OperationalTrip {
  const stops = [...(duty.route?.stops ?? [])].sort((a, b) => a.stopOrder - b.stopOrder)
  const pickupStops = stops.filter((s) => !isDropStop(s))
  const school = stops.find((s) => isDropStop(s)) ?? null
  const sourceStops = pickupStops.length ? pickupStops : stops

  const jobs: OperationalJob[] = sourceStops.map((stop, i) => {
    const name = passengerLabel(stop, i)
    return {
      id: `duty-stop-${duty.id}-${stop.id}`,
      tripId: `duty-trip-${duty.id}`,
      sequence: i + 1,
      passengerId: `stop-${stop.id}`,
      passengerName: name,
      pickupAddress: stop.address ?? stop.name ?? 'Pickup',
      dropoffAddress: school?.name ?? school?.address ?? duty.route?.name ?? 'Destination',
      plannedPickupTime: stopTime(stop) ?? timeFromDutyField(duty.startTime) ?? '08:00',
      plannedDropoffTime: school
        ? stopTime({ ...school, pickupTime: school.dropoffTime ?? school.pickupTime ?? null })
        : stop.dropoffTime
          ? stopTime({ ...stop, pickupTime: stop.dropoffTime })
          : null,
      pickupLatitude: stop.latitude ?? null,
      pickupLongitude: stop.longitude ?? null,
      dropoffLatitude: school?.latitude ?? null,
      dropoffLongitude: school?.longitude ?? null,
      status: 'unstarted',
      wheelchairRequired: false,
      escortRequired: false,
      safeguardingFlag: false,
    }
  })

  const status =
    duty.status === 'completed'
      ? 'completed'
      : duty.status === 'cancelled'
        ? 'cancelled'
        : duty.status === 'in_progress' || duty.status === 'signed_on'
          ? 'in_progress'
          : 'assigned'

  return {
    id: `duty-trip-${duty.id}`,
    reference: duty.reference,
    dutyId: duty.id,
    runReference: duty.reference,
    status,
    driverId: duty.driver?.id ?? null,
    driverName: duty.driver
      ? `${duty.driver.firstName} ${duty.driver.lastName}`
      : null,
    vehicleId: duty.vehicle?.id ?? null,
    vehicleRegistration: duty.vehicle?.registrationNumber ?? null,
    depotId: null,
    depotName: null,
    dispatcherName: null,
    assignmentStatus: duty.driver ? 'assigned' : 'unassigned',
    acceptedAt: null,
    acknowledgedAt: null,
    manifestVersion: 1,
    lastAppSync: null,
    delayMinutes: 0,
    passengersOnboard: 0,
    completedJobCount: 0,
    totalJobCount: jobs.length,
    activeJobId: null,
    jobs,
    gpsLat: duty.lastLatitude ?? null,
    gpsLng: duty.lastLongitude ?? null,
    driverOnline: false,
    routeName: duty.route?.name ?? null,
  }
}

export function workspaceFromDuty(duty: DutyDetailRecord): JourneySequenceWorkspace {
  const trip = dutyToSyntheticTrip(duty)
  return {
    ...buildWorkspace(trip, [trip]),
    acknowledgement: null,
  }
}
