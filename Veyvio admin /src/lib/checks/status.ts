import type { VehicleProfile } from '@/lib/vehicles/types'
import { CHECK_TYPE_LABELS } from '@/lib/vehicles/checks'
import type {
  CheckLifecycleStatus,
  CheckWorkStatus,
  ChecksOperationalRow,
  VehicleCheckReleaseStatus,
} from './types'

const CHECK_VALIDITY_HOURS = 12

export function deriveWorkStatus(v: VehicleProfile): CheckWorkStatus {
  if (v.operationalStatus === 'in_service' && v.currentRunId) return 'live'
  if (v.currentRunReference || v.nextRunReference) return 'assigned'
  if (v.currentRunId) return 'completed'
  return 'unassigned'
}

export function deriveReleaseStatus(v: VehicleProfile, lifecycle: CheckLifecycleStatus): VehicleCheckReleaseStatus {
  if (v.operationalStatus === 'vor') return 'vor'
  if (v.operationalStatus === 'in_workshop' || v.yardStatus === 'workshop') return 'in_maintenance'
  if (lifecycle === 'in_progress' || lifecycle === 'started') return 'check_in_progress'
  if (lifecycle === 'awaiting_review' || lifecycle === 'submitted') return 'awaiting_review'
  if (v.criticalDefectCount > 0 || v.release.releaseDecision === 'blocked') return 'blocked'
  if (v.openDefectCount > 0 && v.release.releaseDecision === 'restricted_use') return 'conditionally_ready'
  if (v.checksOverdue || !v.lastCheckAt) return 'not_checked'
  if (v.release.releaseDecision === 'released' || v.release.releaseDecision === 'released_with_warning') return 'ready'
  return 'blocked'
}

export function computeValidUntil(checkDate: string | null): string | null {
  if (!checkDate) return null
  const d = new Date(checkDate)
  d.setHours(d.getHours() + CHECK_VALIDITY_HOURS)
  return d.toISOString()
}

export function isExpiringSoon(validUntil: string | null): boolean {
  if (!validUntil) return false
  const diff = new Date(validUntil).getTime() - Date.now()
  return diff > 0 && diff < 4 * 60 * 60 * 1000
}

export function computeUrgency(row: Partial<ChecksOperationalRow>): number {
  let score = 0
  if (row.result === 'fail') score += 100
  if (row.highestDefectSeverity === 'dangerous') score += 80
  if (row.highestDefectSeverity === 'major') score += 50
  if (row.workStatus === 'live' || row.workStatus === 'assigned') score += 40
  if (row.nextDepartureTime) score += 30
  if (row.evidenceMissing) score += 20
  if (row.lifecycleStatus === 'awaiting_review') score += 15
  return score
}

export function buildExceptionLabels(v: VehicleProfile, row: Partial<ChecksOperationalRow>): string[] {
  const labels: string[] = []
  if (row.result === 'fail') labels.push('Check failed')
  if (v.criticalDefectCount > 0) labels.push('Safety-critical defect')
  if (row.evidenceMissing) labels.push('Evidence missing')
  if (v.checksOverdue) labels.push('Check overdue')
  if (row.workStatus === 'assigned' && row.operationalStatus !== 'ready') {
    labels.push(`Assigned to ${v.nextRunReference ?? v.currentRunReference ?? 'work'}`)
  }
  if (row.nextDepartureTime && row.operationalStatus !== 'ready') {
    labels.push(`Departure ${row.nextDepartureTime}`)
  }
  return labels
}

export function checkTypeLabel(type: string | null): string {
  if (!type) return '—'
  return CHECK_TYPE_LABELS[type as keyof typeof CHECK_TYPE_LABELS] ?? type.replace(/_/g, ' ')
}
