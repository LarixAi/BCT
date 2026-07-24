import type { DutyRecord } from '@/lib/api/types'
import { flattenTripsToJobs } from '@/lib/operations/job-register'
import { isRunActive, runDriverName, runScheduleDelayMinutes } from '@/lib/ops/runs-trips-schedule'
import type { OperationalException } from '@/lib/types'
import type { OperationalTrip } from '@/lib/transfers/types'

export type DispatchActiveRun = {
  dutyId: string
  reference: string
  driverName: string | null
  vehicleRegistration: string | null
  routeName: string | null
  status: string
  delayMinutes: number
}

export type DispatchLateJob = {
  jobId: string
  reference: string
  passengerName: string
  tripId: string
  tripReference: string
  runReference: string | null
  delayMinutes: number
  requiredTime: string
}

export type DispatchUrgentJob = {
  jobId: string
  reference: string
  passengerName: string
  tripReference: string
  reason: string
  requiredTime: string
}

const ACTIVE_DUTY_STATUSES = new Set([
  'in_progress',
  'passenger_boarded',
  'en_route',
  'signed_on',
  'on_duty',
  'assigned',
])

export function listActiveRuns(duties: DutyRecord[], now = new Date()): DispatchActiveRun[] {
  return duties
    .filter((d) => ACTIVE_DUTY_STATUSES.has(d.status) && d.status !== 'completed')
    .map((d) => ({
      dutyId: d.id,
      reference: d.reference,
      driverName: runDriverName(d),
      vehicleRegistration: d.vehicle?.registrationNumber ?? null,
      routeName: d.route?.name ?? null,
      status: d.status,
      delayMinutes: runScheduleDelayMinutes(d, now),
    }))
    .sort((a, b) => b.delayMinutes - a.delayMinutes)
}

export function listLateJobs(trips: OperationalTrip[]): DispatchLateJob[] {
  const rows: DispatchLateJob[] = []

  for (const trip of trips) {
    if (trip.delayMinutes <= 0 && trip.status === 'completed') continue
    const delay = trip.delayMinutes
    if (delay <= 0) continue

    for (const job of trip.jobs ?? []) {
      if (job.status === 'completed' || job.status === 'cancelled') continue
      rows.push({
        jobId: job.id,
        reference: `${trip.reference}-J${job.sequence}`,
        passengerName: job.passengerName,
        tripId: trip.id,
        tripReference: trip.reference,
        runReference: trip.runReference,
        delayMinutes: delay,
        requiredTime: job.plannedPickupTime,
      })
    }
  }

  return rows.sort((a, b) => b.delayMinutes - a.delayMinutes)
}

export function listUrgentUnassignedJobs(trips: OperationalTrip[]): DispatchUrgentJob[] {
  const jobs = flattenTripsToJobs(trips)
  const rows: DispatchUrgentJob[] = []

  for (const trip of trips) {
    if (trip.assignmentStatus !== 'unassigned' && trip.driverId) continue
    for (const job of trip.jobs ?? []) {
      if (job.status === 'completed' || job.status === 'cancelled') continue
      const reasons: string[] = []
      if (job.safeguardingFlag) reasons.push('Safeguarding')
      if (job.wheelchairRequired) reasons.push('Wheelchair')
      if (trip.delayMinutes > 0) reasons.push(`${trip.delayMinutes} min late`)
      if (reasons.length === 0) reasons.push('Unassigned trip')

      const row = jobs.find((j) => j.id === job.id)
      rows.push({
        jobId: job.id,
        reference: row?.reference ?? job.id,
        passengerName: job.passengerName,
        tripReference: trip.reference,
        reason: reasons.join(' · '),
        requiredTime: job.plannedPickupTime,
      })
    }
  }

  return rows.sort((a, b) => a.requiredTime.localeCompare(b.requiredTime))
}

export function listDispatchExceptions(exceptions: OperationalException[]): OperationalException[] {
  return exceptions
    .filter(
      (ex) =>
        ex.status !== 'resolved' &&
        ex.status !== 'closed' &&
        (ex.severity === 'critical' || ex.severity === 'high'),
    )
    .slice(0, 6)
}

export function isDutyActive(duty: DutyRecord): boolean {
  return isRunActive(duty.status) || ACTIVE_DUTY_STATUSES.has(duty.status)
}
