import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'
import { sequenceEditCapability } from './edit-rules'
import type {
  JourneySequenceWorkspace,
  LinkedJourneyLeg,
  SequenceStop,
} from './types'

/** Normalise ISO timestamps or HH:mm into HH:mm (UTC clock for ISO). */
export function toClockTime(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{1,2}:\d{2}/.test(trimmed)) {
    const [h, m] = trimmed.split(':')
    return `${String(Number(h)).padStart(2, '0')}:${m!.slice(0, 2)}`
  }
  if (trimmed.includes('T') || /[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(11, 16)
    }
  }
  return null
}

function addMinutes(value: string, minutes: number): string {
  const hhmm = toClockTime(value) ?? '08:00'
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes
  const nh = Math.floor((((total % (24 * 60)) + 24 * 60) % (24 * 60)) / 60)
  const nm = ((total % (24 * 60)) + 24 * 60) % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function isLocked(job: OperationalJob): boolean {
  return job.status === 'completed' || job.status === 'onboard' || job.status === 'cancelled'
}

function normaliseAddress(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function pickupLabel(job: OperationalJob): string {
  const name = job.passengerName?.trim()
  const address = job.pickupAddress?.trim()
  if (name && address && !address.toLowerCase().includes(name.toLowerCase())) {
    return `${address} — ${name}`
  }
  return name || address || 'Pickup'
}

/** Operating sequence: optional depot → pickups → drop-offs → optional depot return.
 * Shared school drop-offs collapse to one stop (matches the Stops tab). */
export function buildSequenceStops(
  trip: OperationalTrip,
  orderedPickupJobs?: OperationalJob[],
): SequenceStop[] {
  const pickups = (orderedPickupJobs ?? [...trip.jobs].sort((a, b) => a.sequence - b.sequence)).filter(
    (j) => j.status !== 'cancelled',
  )
  const stops: SequenceStop[] = []
  let pos = 1
  const showDepot = Boolean(trip.depotName?.trim())

  if (showDepot) {
    stops.push({
      id: `${trip.id}-depot-depart`,
      kind: 'depot_depart',
      label: 'Depot departure',
      position: pos++,
      jobId: null,
      passengerId: null,
      passengerName: null,
      address: trip.depotName,
      plannedTime: pickups[0] ? addMinutes(pickups[0].plannedPickupTime, -15) : null,
      estimatedTime: pickups[0] ? addMinutes(pickups[0].plannedPickupTime, -15) : null,
      status: trip.status,
      wheelchairRequired: false,
      escortRequired: false,
      locked: true,
    })
  }

  for (const job of pickups) {
    stops.push({
      id: `${job.id}-pickup`,
      kind: 'pickup',
      label: pickupLabel(job),
      position: pos++,
      jobId: job.id,
      passengerId: job.passengerId,
      passengerName: job.passengerName,
      address: job.pickupAddress,
      plannedTime: toClockTime(job.plannedPickupTime),
      estimatedTime: toClockTime(job.plannedPickupTime),
      status: job.status,
      wheelchairRequired: job.wheelchairRequired,
      escortRequired: job.escortRequired,
      locked: isLocked(job),
    })
  }

  const dropAddresses = new Set(
    pickups.map((j) => normaliseAddress(j.dropoffAddress)).filter(Boolean),
  )
  const sharedSchoolDrop = dropAddresses.size === 1 && pickups.length > 1

  if (sharedSchoolDrop) {
    const sample = pickups[0]!
    stops.push({
      id: `${trip.id}-school-drop`,
      kind: 'dropoff',
      label: sample.dropoffAddress || 'School drop-off',
      position: pos++,
      jobId: null,
      passengerId: null,
      passengerName: null,
      address: sample.dropoffAddress,
      plannedTime: toClockTime(sample.plannedDropoffTime),
      estimatedTime: toClockTime(sample.plannedDropoffTime),
      status: trip.status,
      wheelchairRequired: pickups.some((j) => j.wheelchairRequired),
      escortRequired: pickups.some((j) => j.escortRequired),
      locked: true,
    })
  } else {
    for (const job of pickups) {
      stops.push({
        id: `${job.id}-dropoff`,
        kind: 'dropoff',
        label: `Drop off — ${job.passengerName}`,
        position: pos++,
        jobId: job.id,
        passengerId: job.passengerId,
        passengerName: job.passengerName,
        address: job.dropoffAddress,
        plannedTime: toClockTime(job.plannedDropoffTime),
        estimatedTime: toClockTime(job.plannedDropoffTime),
        status: job.status,
        wheelchairRequired: job.wheelchairRequired,
        escortRequired: job.escortRequired,
        locked: isLocked(job),
      })
    }
  }

  if (showDepot) {
    const lastDrop = pickups[pickups.length - 1]
    stops.push({
      id: `${trip.id}-depot-return`,
      kind: 'depot_return',
      label: 'Depot return',
      position: pos++,
      jobId: null,
      passengerId: null,
      passengerName: null,
      address: trip.depotName,
      plannedTime: lastDrop?.plannedDropoffTime
        ? addMinutes(lastDrop.plannedDropoffTime, 20)
        : lastDrop
          ? addMinutes(lastDrop.plannedPickupTime, 50)
          : null,
      estimatedTime: null,
      status: trip.status,
      wheelchairRequired: false,
      escortRequired: false,
      locked: true,
    })
  }

  return stops
}

export function inferLegDirection(job: OperationalJob): 'outbound' | 'return' {
  const pickup = job.pickupAddress.toLowerCase()
  const drop = job.dropoffAddress.toLowerCase()
  const schoolish = /school|primary|academy|college|centre|hub|hospital/
  if (schoolish.test(drop) && !schoolish.test(pickup)) return 'outbound'
  if (schoolish.test(pickup) && !schoolish.test(drop)) return 'return'
  return 'outbound'
}

export function buildLinkedLegsIndex(
  allTrips: OperationalTrip[],
  currentTripId: string,
): Record<string, LinkedJourneyLeg[]> {
  const map: Record<string, LinkedJourneyLeg[]> = {}
  for (const trip of allTrips) {
    for (const job of trip.jobs) {
      if (job.status === 'cancelled') continue
      const leg: LinkedJourneyLeg = {
        jobId: job.id,
        tripId: trip.id,
        tripReference: trip.reference,
        runReference: trip.runReference,
        passengerId: job.passengerId,
        passengerName: job.passengerName,
        direction: inferLegDirection(job),
        fromAddress: job.pickupAddress,
        toAddress: job.dropoffAddress,
        plannedPickupTime: job.plannedPickupTime,
        plannedDropoffTime: job.plannedDropoffTime ?? null,
        driverName: trip.driverName,
        vehicleRegistration: trip.vehicleRegistration,
        tripStatus: trip.status,
        jobStatus: job.status,
      }
      const list = map[job.passengerId] ?? []
      list.push(leg)
      map[job.passengerId] = list
    }
  }
  // Prefer showing the other trip's opposite-direction leg for the current trip's passengers
  for (const passengerId of Object.keys(map)) {
    map[passengerId] = (map[passengerId] ?? []).filter((l) => l.tripId !== currentTripId || true)
  }
  return map
}

export function findLinkedReturn(
  trip: OperationalTrip,
  job: OperationalJob,
  allTrips: OperationalTrip[],
): LinkedJourneyLeg | null {
  const direction = inferLegDirection(job)
  const want = direction === 'outbound' ? 'return' : 'outbound'
  for (const other of allTrips) {
    if (other.id === trip.id) continue
    for (const j of other.jobs) {
      if (j.passengerId !== job.passengerId) continue
      if (j.status === 'cancelled') continue
      if (inferLegDirection(j) !== want) continue
      return {
        jobId: j.id,
        tripId: other.id,
        tripReference: other.reference,
        runReference: other.runReference,
        passengerId: j.passengerId,
        passengerName: j.passengerName,
        direction: want,
        fromAddress: j.pickupAddress,
        toAddress: j.dropoffAddress,
        plannedPickupTime: j.plannedPickupTime,
        plannedDropoffTime: j.plannedDropoffTime ?? null,
        driverName: other.driverName,
        vehicleRegistration: other.vehicleRegistration,
        tripStatus: other.status,
        jobStatus: j.status,
      }
    }
  }
  return null
}

export function buildWorkspace(
  trip: OperationalTrip,
  allTrips: OperationalTrip[],
  orderedPickupJobs?: OperationalJob[],
): JourneySequenceWorkspace {
  const pickups = orderedPickupJobs ?? [...trip.jobs].sort((a, b) => a.sequence - b.sequence)
  return {
    tripId: trip.id,
    tripReference: trip.reference,
    runReference: trip.runReference,
    routeName: trip.routeName,
    tripStatus: trip.status,
    capability: sequenceEditCapability(trip.status),
    stops: buildSequenceStops(trip, pickups),
    pickupJobIds: pickups.filter((j) => j.status !== 'cancelled').map((j) => j.id),
    linkedLegsByPassengerId: buildLinkedLegsIndex(allTrips, trip.id),
    acknowledgement: null,
  }
}

/** Recalculate estimated pickup times after reorder (simple +4 min spacing). */
export function recalculatePickupTimes(
  jobs: OperationalJob[],
  orderedIds: string[],
): OperationalJob[] {
  const byId = new Map(jobs.map((j) => [j.id, j]))
  const first = byId.get(orderedIds[0]!)
  let cursor = toClockTime(first?.plannedPickupTime) ?? '08:00'
  return orderedIds.map((id, index) => {
    const job = byId.get(id)!
    const plannedPickupTime = index === 0 ? cursor : addMinutes(cursor, 7)
    cursor = plannedPickupTime
    return {
      ...job,
      sequence: index + 1,
      plannedPickupTime,
      plannedDropoffTime: job.plannedDropoffTime
        ? addMinutes(plannedPickupTime, 35)
        : toClockTime(job.plannedDropoffTime),
    }
  })
}
