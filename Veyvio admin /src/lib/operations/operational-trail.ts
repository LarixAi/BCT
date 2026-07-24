import type { DutyRecord } from '@/lib/api/types'
import type { JobSourceType } from '@/lib/operations/job-register'
import { jobSourceLabel } from '@/lib/operations/job-register'
import type { OperationalTrip } from '@/lib/transfers/types'

export type OperationalTrailStepStatus = 'complete' | 'current' | 'pending' | 'warning'

export type OperationalTrailStep = {
  id: string
  label: string
  value: string
  href: string | null
  status: OperationalTrailStepStatus
}

function inferSourceType(trip: OperationalTrip): JobSourceType {
  if (trip.schoolRouteId) return 'school_route'
  if (trip.darRequestId) return 'dial_a_ride'
  if (trip.routeName?.toLowerCase().includes('school')) return 'school_route'
  if (trip.routeName?.toLowerCase().includes('dial')) return 'dial_a_ride'
  return 'booking'
}

export function sourceHref(type: JobSourceType, sourceId: string | null | undefined): string | null {
  if (!sourceId) return null
  switch (type) {
    case 'dial_a_ride':
      return `/dial-a-ride/requests/${sourceId}`
    case 'school_route':
      return `/school-routes/${sourceId}`
    default:
      return `/bookings/${sourceId}`
  }
}

export function resolveTripSource(trip: OperationalTrip): {
  type: JobSourceType
  id: string | null
  reference: string | null
} {
  const type = inferSourceType(trip)
  const id =
    type === 'school_route'
      ? trip.schoolRouteId ?? null
      : type === 'dial_a_ride'
        ? trip.darRequestId ?? null
        : trip.bookingId ?? null
  const reference =
    type === 'school_route'
      ? trip.schoolRouteReference ?? trip.runReference
      : type === 'dial_a_ride'
        ? trip.darRequestReference ?? trip.runReference
        : trip.bookingReference ?? trip.runReference
  return { type, id, reference: reference ?? null }
}

export function buildOperationalTrail(input: {
  sourceType?: JobSourceType | null
  sourceId?: string | null
  sourceReference?: string | null
  jobReference?: string | null
  jobId?: string | null
  tripReference?: string | null
  tripId?: string | null
  runReference?: string | null
  runId?: string | null
  current?: 'source' | 'job' | 'trip' | 'run' | 'live'
}): OperationalTrailStep[] {
  const current = input.current ?? 'trip'
  const sourceType = input.sourceType ?? 'booking'
  const steps: OperationalTrailStep[] = [
    {
      id: 'source',
      label: jobSourceLabel(sourceType),
      value: input.sourceReference ?? 'Source',
      href: sourceHref(sourceType, input.sourceId),
      status: stepStatus('source', current, Boolean(input.sourceId || input.sourceReference)),
    },
    {
      id: 'job',
      label: 'Job',
      value: input.jobReference ?? 'Unscheduled',
      href: input.tripId ? `/trips/${input.tripId}?tab=jobs` : null,
      status: stepStatus('job', current, Boolean(input.jobReference)),
    },
    {
      id: 'trip',
      label: 'Trip',
      value: input.tripReference ?? 'Not planned',
      href: input.tripId ? `/trips/${input.tripId}` : null,
      status: stepStatus('trip', current, Boolean(input.tripId)),
    },
    {
      id: 'run',
      label: 'Run',
      value: input.runReference ?? 'Not assigned',
      href: input.runId ? `/runs/${input.runId}` : null,
      status: stepStatus('run', current, Boolean(input.runId)),
    },
    {
      id: 'live',
      label: 'Live',
      value: 'Dispatch',
      href: input.runId ? `/dispatch?duty=${input.runId}` : '/dispatch',
      status: stepStatus('live', current, Boolean(input.runId)),
    },
  ]

  return steps
}

function stepStatus(
  step: OperationalTrailStep['id'],
  current: NonNullable<Parameters<typeof buildOperationalTrail>[0]['current']>,
  hasValue: boolean,
): OperationalTrailStepStatus {
  if (step === current) return hasValue ? 'current' : 'warning'
  const order = ['source', 'job', 'trip', 'run', 'live'] as const
  const stepIdx = order.indexOf(step)
  const currentIdx = order.indexOf(current)
  if (stepIdx < currentIdx && hasValue) return 'complete'
  if (hasValue) return 'complete'
  return 'pending'
}

export function buildTrailFromTrip(trip: OperationalTrip, duty?: DutyRecord | null): OperationalTrailStep[] {
  const source = resolveTripSource(trip)
  const primaryJob = trip.jobs?.[0]
  return buildOperationalTrail({
    sourceType: source.type,
    sourceId: source.id,
    sourceReference: source.reference,
    jobReference: primaryJob ? `${trip.reference}-J${primaryJob.sequence}` : null,
    jobId: primaryJob?.id ?? null,
    tripReference: trip.reference,
    tripId: trip.id,
    runReference: trip.runReference ?? duty?.reference ?? null,
    runId: trip.dutyId ?? duty?.id ?? null,
    current: trip.status === 'in_progress' || trip.status === 'passenger_boarded' ? 'live' : 'trip',
  })
}

export function buildTrailFromDuty(duty: DutyRecord, trip?: OperationalTrip | null): OperationalTrailStep[] {
  if (trip) return buildTrailFromTrip(trip, duty)
  return buildOperationalTrail({
    sourceReference: duty.route?.name ?? duty.reference,
    runReference: duty.reference,
    runId: duty.id,
    current: ['in_progress', 'passenger_boarded', 'en_route'].includes(duty.status) ? 'live' : 'run',
  })
}
