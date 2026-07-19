import { isPmiChecklistComplete, pmiChecklistCompletionBlockers } from '@/lib/maintenance/pmi-checklist'
import type { InspectionRecord } from './types'

const OPEN_DEFECT_STATUSES = new Set(['open', 'triaged', 'awaiting_repair', 'in_repair', 'reported'])
const OPEN_WO_STATUSES = new Set([
  'draft',
  'scheduled',
  'awaiting_authorisation',
  'approved',
  'in_progress',
  'awaiting_parts',
  'quality_check',
])

/** Blockers that prevent inspection sign-off / release. */
export function inspectionSignOffBlockers(row: InspectionRecord): string[] {
  const blockers: string[] = []

  if (['signed_off', 'held'].includes(row.status) && row.outcome === 'pass') {
    return []
  }

  if (row.inspectionType === 'safety_pmi') {
    if (!row.checklist) {
      blockers.push('Safety inspection checklist has not been started')
    } else {
      blockers.push(...pmiChecklistCompletionBlockers(row.checklist))
    }
  }

  const openDefects = row.linkedDefects.filter((d) => OPEN_DEFECT_STATUSES.has(d.status))
  for (const d of openDefects) {
    if (d.severity === 'safety_critical' || d.severity === 'critical' || d.severity === 'safety') {
      blockers.push(`Open safety defect: ${d.component}`)
    }
  }

  const openWos = row.linkedWorkOrders.filter((w) => OPEN_WO_STATUSES.has(w.status))
  for (const w of openWos) {
    blockers.push(`Linked work order still open: ${w.title}`)
  }

  if (row.outcome === 'fail_vor') {
    blockers.push('Failed VOR outcome — vehicle must remain held until reinspection')
  }

  if (row.outcome === 'rectification_required' && openWos.length === 0 && openDefects.length > 0) {
    blockers.push('Rectification required — defects must be closed or verified')
  }

  if (row.outcome === 'pending' || row.outcome === 'incomplete') {
    blockers.push('Inspection outcome is not complete')
  }

  return blockers
}

export function canSignOffInspection(row: InspectionRecord): boolean {
  if (row.status === 'signed_off') return false
  if (!['awaiting_sign_off', 'completed', 'rectification_pending'].includes(row.status)) {
    return false
  }
  return inspectionSignOffBlockers(row).length === 0
}

export function isInspectionChecklistReady(row: InspectionRecord): boolean {
  if (row.inspectionType !== 'safety_pmi') return true
  return isPmiChecklistComplete(row.checklist)
}
