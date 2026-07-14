import type { IncidentAuditEntry, IncidentTimelineEvent } from './types'

export function buildIncidentAuditTrail(
  timeline: IncidentTimelineEvent[],
  incidentRef: string,
): IncidentAuditEntry[] {
  return timeline
    .map((e) => ({
      id: `audit-${e.id}`,
      incidentRef,
      action: e.action,
      actorName: e.actorName,
      role: e.isSystem ? 'system' : 'administrator',
      occurredAt: e.occurredAt,
      detail: e.detail,
      sourceApplication: e.isSystem ? 'system' : 'command',
    }))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}
