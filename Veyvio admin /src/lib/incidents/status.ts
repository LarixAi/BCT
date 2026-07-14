import type { IncidentRegisterRow, IncidentSeverity, IncidentStatus, StoredIncident } from './types'

const ACTIVE_STATUSES: IncidentStatus[] = [
  'submitted',
  'awaiting_triage',
  'immediate_response',
  'contained',
  'under_investigation',
  'awaiting_evidence',
  'awaiting_external',
  'corrective_actions_open',
  'pending_final_review',
  'reopened',
]

export function isActiveIncident(status: IncidentStatus): boolean {
  return ACTIVE_STATUSES.includes(status)
}

export function computeAgeMinutes(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
}

export function computeUrgency(row: Pick<IncidentRegisterRow, 'severity' | 'isAcknowledged' | 'isOverdue' | 'isSafeguarding' | 'warningFlags'>): number {
  let score = 0
  const severityWeight: Record<IncidentSeverity, number> = {
    critical: 100,
    high: 70,
    medium: 40,
    low: 15,
    near_miss: 20,
  }
  score += severityWeight[row.severity]
  if (!row.isAcknowledged) score += 30
  if (row.isSafeguarding) score += 25
  if (row.isOverdue) score += 20
  score += row.warningFlags.length * 5
  return score
}

export function incidentRef(id: string): string {
  const num = id.replace(/\D/g, '').padStart(3, '0')
  return `INC-2026-${num}`
}

export function buildInvolvedSummary(inc: StoredIncident): string {
  const parts: string[] = []
  if (inc.vehicleRegistration) parts.push(inc.vehicleRegistration)
  if (inc.driverName) parts.push(inc.driverName)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export function buildWarningFlags(inc: StoredIncident): import('./types').IncidentWarningFlag[] {
  const flags: import('./types').IncidentWarningFlag[] = []
  if (!inc.isAcknowledged && ['critical', 'high'].includes(inc.severity)) flags.push('unacknowledged')
  if (inc.vehicleStillOperational && inc.severity !== 'near_miss') flags.push('vehicle_still_operational')
  if (inc.driverStillAssigned && ['critical', 'high'].includes(inc.severity)) flags.push('driver_still_assigned')
  if (inc.evidence.length === 0 && !['closed', 'cancelled_duplicate'].includes(inc.status)) flags.push('evidence_missing')
  if (inc.regulatoryAssessments.some((r) => r.status === 'pending' && r.deadline)) flags.push('external_deadline')
  if (inc.correctiveActions.some((a) => a.status === 'overdue')) flags.push('actions_overdue')
  return flags
}

export function nextDeadline(inc: StoredIncident): { at: string | null; label: string | null } {
  const overdueAction = inc.correctiveActions.find((a) => a.status === 'open' || a.status === 'overdue')
  if (overdueAction) return { at: overdueAction.dueDate, label: overdueAction.title }
  const reg = inc.regulatoryAssessments.find((r) => r.deadline && r.status === 'pending')
  if (reg?.deadline) return { at: reg.deadline, label: `${reg.label} assessment` }
  return { at: null, label: null }
}

export function isOverdueIncident(inc: StoredIncident): boolean {
  const { at } = nextDeadline(inc)
  if (!at) return false
  return new Date(at).getTime() < Date.now()
}

export function externalFlags(inc: StoredIncident): string[] {
  return inc.regulatoryAssessments
    .filter((r) => r.potentiallyRequired || r.status === 'pending')
    .map((r) => r.label)
}
