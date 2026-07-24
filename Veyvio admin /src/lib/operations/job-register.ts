import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'

export type JobSourceType = 'booking' | 'dial_a_ride' | 'school_route'

export type JobRegisterRow = {
  id: string
  reference: string
  sourceType: JobSourceType
  sourceReference: string | null
  sourceId: string | null
  passengerName: string
  journey: string
  requiredTime: string
  requirements: string[]
  tripReference: string | null
  tripId: string | null
  driverName: string | null
  vehicleRegistration: string | null
  status: string
  warning: string | null
  priority: 'normal' | 'urgent'
}

function inferSourceType(trip: OperationalTrip): JobSourceType {
  if (trip.routeName?.toLowerCase().includes('school')) return 'school_route'
  if (trip.routeName?.toLowerCase().includes('dial')) return 'dial_a_ride'
  return 'booking'
}

function sourceLabel(type: JobSourceType): string {
  switch (type) {
    case 'dial_a_ride':
      return 'Dial-a-Ride'
    case 'school_route':
      return 'School Route'
    default:
      return 'Booking'
  }
}

export { sourceLabel as jobSourceLabel }

function requirementTags(job: OperationalJob): string[] {
  const tags: string[] = []
  if (job.wheelchairRequired) tags.push('Wheelchair')
  if (job.escortRequired) tags.push('Assistant')
  if (job.safeguardingFlag) tags.push('Safeguarding')
  return tags
}

export function flattenTripsToJobs(trips: OperationalTrip[]): JobRegisterRow[] {
  const rows: JobRegisterRow[] = []

  for (const trip of trips) {
    const sourceType = inferSourceType(trip)
    for (const job of trip.jobs ?? []) {
      rows.push({
        id: job.id,
        reference: `${trip.reference}-J${job.sequence}`,
        sourceType,
        sourceReference: trip.runReference ?? trip.reference,
        sourceId: trip.bookingId ?? null,
        passengerName: job.passengerName,
        journey: `${job.pickupAddress || 'Pickup'} → ${job.dropoffAddress || 'Destination'}`,
        requiredTime: job.plannedPickupTime || '—',
        requirements: requirementTags(job),
        tripReference: trip.reference,
        tripId: trip.id,
        driverName: trip.driverName,
        vehicleRegistration: trip.vehicleRegistration,
        status: job.status,
        warning:
          trip.delayMinutes > 5
            ? `${trip.delayMinutes} min late`
            : trip.assignmentStatus === 'unassigned'
              ? 'Unassigned trip'
              : null,
        priority: 'normal',
      })
    }
  }

  return rows.sort((a, b) => a.requiredTime.localeCompare(b.requiredTime))
}

export function jobRegisterSummary(rows: JobRegisterRow[]) {
  const today = new Date().toISOString().slice(0, 10)
  return {
    unscheduled: rows.filter((r) => r.status === 'unstarted' || r.status === 'waiting').length,
    dueToday: rows.filter((r) => r.requiredTime.startsWith(today) || r.requiredTime.includes(':')).length,
    inProgress: rows.filter((r) => r.status === 'onboard' || r.status === 'waiting').length,
    exceptions: rows.filter((r) => Boolean(r.warning)).length,
  }
}
