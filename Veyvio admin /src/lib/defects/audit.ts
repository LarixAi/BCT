import type { VehicleAuditEvent } from '@/lib/vehicles/types'
import type { DefectAuditEntry } from './types'

const DEFECT_ACTION_KEYWORDS = [
  'defect',
  'restriction',
  'evidence',
  'repair',
  'verification',
  'vor',
  'triage',
]

export function filterDefectAuditEvents(events: VehicleAuditEvent[], defectId: string): DefectAuditEntry[] {
  return events
    .filter((e) => {
      const haystack = `${e.action} ${e.previousValue ?? ''} ${e.newValue ?? ''} ${e.reason ?? ''}`.toLowerCase()
      return haystack.includes(defectId.toLowerCase()) || DEFECT_ACTION_KEYWORDS.some((k) => e.action.toLowerCase().includes(k))
    })
    .map((e) => ({
      id: e.id,
      action: e.action,
      actorName: e.actor,
      role: e.actorRole,
      occurredAt: e.createdAt,
      previousValue: e.previousValue,
      newValue: e.newValue,
      reason: e.reason,
      sourceApplication: e.sourceApplication ?? 'command',
    }))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}
