import { buildSequenceStops, toClockTime } from '@/lib/journey-sequence/build-sequence'
import type { SequenceStop } from '@/lib/journey-sequence/types'
import type { DutyRecord } from '@/lib/api/types'
import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'

export type TripListRow = {
  id: string
  reference: string
  serviceDate: string
  startTime: string
  endTime: string
  depotName: string
  jobCount: number
  stopCount: number
  driverName: string | null
  vehicleRegistration: string | null
  status: string
  routeWarning: string | null
  routeName: string | null
}

export type TripRouteMetrics = {
  stopCount: number
  distanceKm: number
  durationMinutes: number
  deadMileageKm: number
  passengersOnboard: number
}

export type TripRouteVersion = {
  version: number
  publishedAt: string
  summary: string
  requiresDriverAck: boolean
  acknowledged: boolean
}

export type TripTimelineEvent = {
  id: string
  at: string
  title: string
  detail: string
  kind: 'route' | 'assignment' | 'status'
}

const VERSION_SUMMARIES = [
  'Initial route published',
  'Passenger cancelled — stops recalculated',
  'Emergency job added — sequence updated',
  'Pickup time adjusted after late running',
  'Safeguarding stop order revised',
]

function parseClockMinutes(value: string | null | undefined): number | null {
  const clock = toClockTime(value)
  if (!clock) return null
  const [h, m] = clock.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function minutesBetween(start: string | null | undefined, end: string | null | undefined): number {
  const a = parseClockMinutes(start)
  const b = parseClockMinutes(end)
  if (a == null || b == null) return 0
  return Math.max(0, b - a)
}

export function tripStops(trip: OperationalTrip): SequenceStop[] {
  return buildSequenceStops(trip)
}

export function tripRouteWarning(trip: OperationalTrip): string | null {
  if (trip.assignmentStatus === 'unassigned' || !trip.driverId) {
    return 'No driver assigned'
  }
  if (!trip.vehicleId) return 'No vehicle assigned'
  if (trip.delayMinutes >= 15) return `${trip.delayMinutes} min behind plan`
  if (trip.jobs.some((j) => j.safeguardingFlag) && trip.assignmentStatus !== 'acknowledged') {
    return 'Safeguarding — driver acknowledgement pending'
  }
  if (trip.manifestVersion > 1 && !trip.acknowledgedAt) {
    return 'Route changed — driver must acknowledge'
  }
  return null
}

export function tripRouteMetrics(trip: OperationalTrip, stops?: SequenceStop[]): TripRouteMetrics {
  const sequence = stops ?? tripStops(trip)
  const jobs = trip.jobs ?? []
  const legKm = jobs.length * 4.2 + Math.max(0, sequence.length - jobs.length) * 1.5
  const firstStop = sequence[0]
  const lastStop = sequence[sequence.length - 1]
  const durationMinutes =
    minutesBetween(firstStop?.plannedTime, lastStop?.plannedTime) ||
    jobs.reduce((sum, job) => sum + minutesBetween(job.plannedPickupTime, job.plannedDropoffTime), 0) ||
    Math.max(30, jobs.length * 12)

  return {
    stopCount: sequence.length,
    distanceKm: Math.round(legKm * 10) / 10,
    durationMinutes,
    deadMileageKm: trip.depotName ? 6.4 : 0,
    passengersOnboard: trip.passengersOnboard,
  }
}

export function buildTripRouteVersions(trip: OperationalTrip): TripRouteVersion[] {
  const count = Math.max(1, trip.manifestVersion || 1)
  const base = new Date()
  base.setHours(7, 0, 0, 0)

  return Array.from({ length: count }, (_, index) => {
    const version = index + 1
    const publishedAt = new Date(base.getTime() + index * 72 * 60_000).toISOString()
    const requiresDriverAck = version > 1
    return {
      version,
      publishedAt,
      summary: VERSION_SUMMARIES[index] ?? `Route update v${version}`,
      requiresDriverAck,
      acknowledged: !requiresDriverAck || Boolean(trip.acknowledgedAt),
    }
  })
}

export function buildTripTimeline(trip: OperationalTrip): TripTimelineEvent[] {
  const events: TripTimelineEvent[] = []

  for (const version of buildTripRouteVersions(trip)) {
    events.push({
      id: `route-v${version.version}`,
      at: version.publishedAt,
      title: `Route version ${version.version} published`,
      detail: version.summary,
      kind: 'route',
    })
  }

  if (trip.acceptedAt) {
    events.push({
      id: 'accepted',
      at: trip.acceptedAt,
      title: 'Driver accepted trip',
      detail: trip.driverName ?? 'Driver',
      kind: 'assignment',
    })
  }

  if (trip.acknowledgedAt) {
    events.push({
      id: 'acknowledged',
      at: trip.acknowledgedAt,
      title: 'Driver acknowledged route',
      detail: `Manifest v${trip.manifestVersion}`,
      kind: 'assignment',
    })
  }

  if (trip.status === 'in_progress') {
    events.push({
      id: 'in-progress',
      at: trip.lastAppSync ?? new Date().toISOString(),
      title: 'Trip in progress',
      detail: `${trip.completedJobCount}/${trip.totalJobCount} jobs complete`,
      kind: 'status',
    })
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export function jobOnboardLabel(job: OperationalJob): string {
  switch (job.status) {
    case 'onboard':
      return 'Onboard'
    case 'completed':
      return 'Dropped off'
    case 'waiting':
      return 'Waiting'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Not picked up'
  }
}

export function stopOnboardSummary(stop: SequenceStop, trip: OperationalTrip): string | null {
  if (stop.kind !== 'pickup' && stop.kind !== 'dropoff') return null
  if (!stop.jobId) {
    if (stop.kind === 'dropoff' && stop.passengerName == null) {
      const onboard = trip.jobs.filter((j) => j.status === 'onboard' || j.status === 'completed').length
      return onboard > 0 ? `${onboard} passengers` : 'No passengers onboard'
    }
    return null
  }
  const job = trip.jobs.find((j) => j.id === stop.jobId)
  return job ? jobOnboardLabel(job) : null
}

export function tripListRow(trip: OperationalTrip, duty?: DutyRecord | null): TripListRow {
  const jobs = trip.jobs ?? []
  const stops = tripStops(trip)
  const sortedJobs = [...jobs].sort((a, b) => a.sequence - b.sequence)
  const firstPickup = sortedJobs[0]?.plannedPickupTime ?? null
  const lastJob = sortedJobs[sortedJobs.length - 1]
  const endTime = lastJob?.plannedDropoffTime ?? lastJob?.plannedPickupTime ?? null

  return {
    id: trip.id,
    reference: trip.reference,
    serviceDate: duty?.dutyDate ?? '—',
    startTime: toClockTime(firstPickup) ?? '—',
    endTime: toClockTime(endTime) ?? '—',
    depotName: trip.depotName ?? duty?.route?.name ?? '—',
    jobCount: trip.totalJobCount,
    stopCount: stops.length,
    driverName: trip.driverName,
    vehicleRegistration: trip.vehicleRegistration,
    status: trip.status,
    routeWarning: tripRouteWarning(trip),
    routeName: trip.routeName,
  }
}
