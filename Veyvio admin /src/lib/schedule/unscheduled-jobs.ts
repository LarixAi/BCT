import { jobSourceLabel, type JobSourceType } from '@/lib/operations/job-register'
import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'
import type { PlanningJob } from '@/lib/schedule/planning-types'

function inferSourceType(trip: OperationalTrip): JobSourceType {
  if (trip.routeName?.toLowerCase().includes('school')) return 'school_route'
  if (trip.routeName?.toLowerCase().includes('dial')) return 'dial_a_ride'
  return 'booking'
}

function requirementTags(job: OperationalJob): string[] {
  const tags: string[] = []
  if (job.wheelchairRequired) tags.push('Wheelchair')
  if (job.escortRequired) tags.push('Assistant')
  if (job.safeguardingFlag) tags.push('Safeguarding')
  return tags
}

function estimateDurationMinutes(job: OperationalJob): number {
  if (job.plannedPickupTime && job.plannedDropoffTime) {
    const [ph, pm] = job.plannedPickupTime.split(':').map(Number)
    const [dh, dm] = job.plannedDropoffTime.split(':').map(Number)
    if (Number.isFinite(ph) && Number.isFinite(dh)) {
      return Math.max(15, dh * 60 + dm - (ph * 60 + pm))
    }
  }
  return job.wheelchairRequired ? 45 : 30
}

export function isUnscheduledPlanningJob(trip: OperationalTrip, job: OperationalJob): boolean {
  if (job.status !== 'unstarted' && job.status !== 'waiting') return false
  if (trip.assignmentStatus === 'unassigned') return true
  if (!trip.driverId || !trip.vehicleId) return true
  return false
}

export function listUnscheduledPlanningJobs(trips: OperationalTrip[]): PlanningJob[] {
  const rows: PlanningJob[] = []

  for (const trip of trips) {
    const sourceType = inferSourceType(trip)
    for (const job of trip.jobs ?? []) {
      if (!isUnscheduledPlanningJob(trip, job)) continue
      rows.push({
        jobId: job.id,
        tripId: trip.id,
        tripReference: trip.reference,
        reference: `${trip.reference}-J${job.sequence}`,
        passengerName: job.passengerName,
        pickupAddress: job.pickupAddress,
        dropoffAddress: job.dropoffAddress,
        journey: `${job.pickupAddress || 'Pickup'} → ${job.dropoffAddress || 'Destination'}`,
        requiredTime: job.plannedPickupTime || '—',
        sourceType,
        sourceLabel: jobSourceLabel(sourceType),
        requirements: requirementTags(job),
        priority: job.safeguardingFlag ? 'urgent' : 'normal',
        estimatedDurationMinutes: estimateDurationMinutes(job),
        status: job.status,
        dutyId: trip.dutyId,
        runReference: trip.runReference,
      })
    }
  }

  return rows.sort((a, b) => a.requiredTime.localeCompare(b.requiredTime))
}

export function findPlanningJob(trips: OperationalTrip[], jobId: string): PlanningJob | null {
  return listUnscheduledPlanningJobs(trips).find((j) => j.jobId === jobId) ?? null
}

export function findOperationalJob(
  trips: OperationalTrip[],
  jobId: string,
): { trip: OperationalTrip; job: OperationalJob } | null {
  for (const trip of trips) {
    const job = trip.jobs?.find((j) => j.id === jobId)
    if (job) return { trip, job }
  }
  return null
}
