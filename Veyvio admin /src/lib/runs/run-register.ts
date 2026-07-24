import type { DutyRecord } from '@/lib/api/types'
import {
  dutyClockMs,
  formatDelayLabel,
  formatDutyClock,
  runDriverName,
  runScheduleDelayMinutes,
} from '@/lib/ops/runs-trips-schedule'

export type RunLifecycleStage =
  | 'draft'
  | 'planned'
  | 'published'
  | 'acknowledged'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

export type RunListRow = {
  id: string
  reference: string
  dutyDate: string
  depotName: string
  driverName: string | null
  vehicleRegistration: string | null
  passengerAssistantName: string | null
  startTime: string
  endTime: string
  tripCount: number
  workingTimeMinutes: number
  lifecycle: RunLifecycleStage
  status: string
  warning: string | null
}

export type RunPublishValidation = {
  canPublish: boolean
  blockers: string[]
  warnings: string[]
}

const ACTIVE_STATUSES = new Set([
  'in_progress',
  'passenger_boarded',
  'en_route',
  'signed_on',
  'on_duty',
])

export function deriveRunLifecycle(duty: DutyRecord): RunLifecycleStage {
  const status = (duty.status ?? '').toLowerCase().replace(/-/g, '_')
  if (status === 'cancelled') return 'cancelled'
  if (status === 'completed' || status === 'signed_off') return 'completed'
  if (status === 'paused') return 'paused'
  if (ACTIVE_STATUSES.has(status)) return 'active'
  if (duty.driverLifecycleStatus === 'acknowledged') return 'acknowledged'
  if (duty.publicationStatus === 'published') {
    return duty.acknowledgementRequired && !duty.driverLifecycleStatus ? 'published' : 'published'
  }
  if (duty.driver && duty.vehicle) return 'planned'
  return 'draft'
}

export function runWorkingTimeMinutes(duty: DutyRecord): number {
  const start = dutyClockMs(duty.startTime, duty.dutyDate)
  const end = dutyClockMs(duty.endTime ?? null, duty.dutyDate)
  if (start == null || end == null) return 0
  return Math.max(0, Math.round((end - start) / 60_000))
}

export function formatWorkingTime(minutes: number): string {
  if (minutes <= 0) return '—'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

export function runWarning(duty: DutyRecord, tripCount = 0): string | null {
  if (!duty.driver) return 'No driver assigned'
  if (!duty.vehicle) return 'No vehicle assigned'
  if (duty.vehicle?.status === 'off_road') return 'Vehicle is VOR'
  const delay = runScheduleDelayMinutes(duty)
  if (delay >= 8) return `${formatDelayLabel(delay)} behind plan`
  if (tripCount === 0) return 'No trips on this run'
  if (deriveRunLifecycle(duty) === 'planned') return 'Ready to publish'
  if (duty.acknowledgementRequired && duty.driverLifecycleStatus !== 'acknowledged') {
    return 'Driver acknowledgement pending'
  }
  return null
}

export function validateRunPublish(duty: DutyRecord, tripCount = 0): RunPublishValidation {
  const blockers: string[] = []
  const warnings: string[] = []

  if (!duty.driver) blockers.push('Assign a driver before publishing')
  if (!duty.vehicle) blockers.push('Assign a vehicle before publishing')
  if (duty.vehicle?.status === 'off_road') blockers.push('Vehicle is off road — swap before publish')
  if (tripCount === 0) warnings.push('Run has no trips — confirm this is intentional')

  const lifecycle = deriveRunLifecycle(duty)
  if (lifecycle === 'published' || lifecycle === 'active' || lifecycle === 'completed') {
    blockers.push('Run is already published')
  }

  return {
    canPublish: blockers.length === 0,
    blockers,
    warnings,
  }
}

export function runDepotLabel(duty: DutyRecord, tripDepot?: string | null): string {
  return tripDepot ?? 'Wembley Depot'
}

export function runListRow(
  duty: DutyRecord,
  opts?: { tripCount?: number; depotName?: string | null },
): RunListRow {
  const tripCount = opts?.tripCount ?? 0
  const pa = duty.passengerAssistant
  return {
    id: duty.id,
    reference: duty.reference,
    dutyDate: duty.dutyDate,
    depotName: runDepotLabel(duty, opts?.depotName),
    driverName: runDriverName(duty),
    vehicleRegistration: duty.vehicle?.registrationNumber ?? null,
    passengerAssistantName: pa ? `${pa.firstName} ${pa.lastName}` : null,
    startTime: formatDutyClock(duty.startTime),
    endTime: formatDutyClock(duty.endTime),
    tripCount,
    workingTimeMinutes: runWorkingTimeMinutes(duty),
    lifecycle: deriveRunLifecycle(duty),
    status: duty.status,
    warning: runWarning(duty, tripCount),
  }
}

export function lifecycleLabel(stage: RunLifecycleStage): string {
  return stage.replace(/_/g, ' ')
}
