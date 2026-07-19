import type { VehicleProfile } from './types'

export type VehicleTimelineCategory =
  | 'all'
  | 'maintenance'
  | 'driver'
  | 'yard'
  | 'fuel'
  | 'adblue'
  | 'defect'
  | 'document'
  | 'compliance'
  | 'tyre'
  | 'equipment'
  | 'report'

export interface VehicleTimelineEvent {
  id: string
  occurredAt: string
  category: Exclude<VehicleTimelineCategory, 'all'>
  title: string
  detail: string | null
  actorName: string | null
  source: string | null
  href: string | null
}

function push(
  events: VehicleTimelineEvent[],
  event: VehicleTimelineEvent,
) {
  if (!event.occurredAt || Number.isNaN(new Date(event.occurredAt).getTime())) return
  events.push(event)
}

export function buildVehicleTimeline(vehicle: VehicleProfile): VehicleTimelineEvent[] {
  const events: VehicleTimelineEvent[] = []

  for (const e of Array.isArray(vehicle.platformEvents) ? vehicle.platformEvents : []) {
    push(events, {
      id: `plat-${e.id}`,
      occurredAt: e.createdAt,
      category: e.type.includes('defect')
        ? 'defect'
        : e.type.includes('vor') || e.type.includes('service') || e.type.includes('maintenance')
          ? 'maintenance'
          : 'driver',
      title: e.summary || e.type.replace(/[._]/g, ' '),
      detail: e.type,
      actorName: e.actorName ?? null,
      source: e.sourceApplication ?? 'platform',
      href: null,
    })
  }

  for (const e of Array.isArray(vehicle.auditEvents) ? vehicle.auditEvents : []) {
    push(events, {
      id: `aud-${e.id}`,
      occurredAt: e.createdAt,
      category: e.action.toLowerCase().includes('document')
        ? 'document'
        : e.action.toLowerCase().includes('vor') || e.action.toLowerCase().includes('work')
          ? 'maintenance'
          : 'compliance',
      title: e.action,
      detail: e.reason,
      actorName: e.actor,
      source: e.sourceApplication ?? e.actorRole ?? 'command',
      href: null,
    })
  }

  for (const d of Array.isArray(vehicle.defects) ? vehicle.defects : []) {
    push(events, {
      id: `def-open-${d.id}`,
      occurredAt: d.reportedAt,
      category: 'defect',
      title: `Defect reported — ${d.component || d.category}`,
      detail: d.description,
      actorName: d.reportedBy,
      source: d.source ?? 'defect',
      href: null,
    })
    if (d.closedAt) {
      push(events, {
        id: `def-close-${d.id}`,
        occurredAt: d.closedAt,
        category: 'defect',
        title: `Defect closed — ${d.component || d.category}`,
        detail: d.closureReason,
        actorName: d.closedBy,
        source: 'maintenance',
        href: null,
      })
    }
  }

  for (const w of Array.isArray(vehicle.workOrders) ? vehicle.workOrders : []) {
    push(events, {
      id: `wo-${w.id}`,
      occurredAt: w.createdAt,
      category: 'maintenance',
      title: `Work order — ${w.title}`,
      detail: `${w.status.replace(/_/g, ' ')}${w.provider ? ` · ${w.provider}` : ''}`,
      actorName: w.createdBy,
      source: w.creationSource ?? 'maintenance',
      href: '/maintenance?tab=work-orders',
    })
    if (w.completedDate) {
      push(events, {
        id: `wo-done-${w.id}`,
        occurredAt: w.completedDate,
        category: 'maintenance',
        title: `Work completed — ${w.title}`,
        detail: w.workCompleted ?? w.notes,
        actorName: w.technicianName ?? w.managerName,
        source: 'workshop',
        href: '/maintenance?tab=work-orders',
      })
    }
  }

  for (const v of Array.isArray(vehicle.vorRecords) ? vehicle.vorRecords : []) {
    push(events, {
      id: `vor-open-${v.id}`,
      occurredAt: v.reportedAt,
      category: 'maintenance',
      title: 'Vehicle marked VOR',
      detail: v.reason,
      actorName: v.reportedBy,
      source: 'command',
      href: null,
    })
    if (v.returnedToRoadAt || v.resolvedAt) {
      push(events, {
        id: `vor-close-${v.id}`,
        occurredAt: (v.returnedToRoadAt ?? v.resolvedAt) as string,
        category: 'maintenance',
        title: 'Vehicle returned to road',
        detail: v.workPerformed ?? v.resolutionReason,
        actorName: v.returnedToRoadBy ?? v.resolvedBy,
        source: 'command',
        href: null,
      })
    }
  }

  for (const c of Array.isArray(vehicle.checks) ? vehicle.checks : []) {
    push(events, {
      id: `chk-${c.id}`,
      occurredAt: c.checkDate,
      category: c.sourceApplication === 'yard' ? 'yard' : 'driver',
      title: `Check — ${c.checkType.replace(/_/g, ' ')}`,
      detail: c.result,
      actorName: c.performedBy,
      source: c.sourceApplication,
      href: null,
    })
  }

  for (const doc of Array.isArray(vehicle.documents) ? vehicle.documents : []) {
    const when = doc.verifiedAt ?? doc.issueDate
    if (!when) continue
    push(events, {
      id: `doc-${doc.id}`,
      occurredAt: when,
      category: 'document',
      title: `Document — ${doc.label}`,
      detail: doc.expiryDate ? `Expires ${doc.expiryDate}` : null,
      actorName: doc.verifiedBy ?? null,
      source: 'compliance',
      href: null,
    })
  }

  for (const e of Array.isArray(vehicle.downtimeEvents) ? vehicle.downtimeEvents : []) {
    push(events, {
      id: `dt-${e.id}`,
      occurredAt: e.occurredAt,
      category: 'maintenance',
      title: `Downtime — ${e.stage.replace(/_/g, ' ')}`,
      detail: e.notes ?? null,
      actorName: e.actorName ?? null,
      source: 'workshop',
      href: null,
    })
  }

  for (const eq of Array.isArray(vehicle.equipment) ? vehicle.equipment : []) {
    if (!eq.lastCheckedAt) continue
    push(events, {
      id: `eq-${eq.id}`,
      occurredAt: eq.lastCheckedAt,
      category: 'equipment',
      title: `Equipment check — ${eq.name}`,
      detail: eq.conditionLabel ?? (eq.assigned ? 'assigned' : 'unassigned'),
      actorName: null,
      source: 'yard',
      href: null,
    })
  }

  return events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}

export const TIMELINE_FILTERS: Array<{ id: VehicleTimelineCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'driver', label: 'Driver' },
  { id: 'yard', label: 'Yard' },
  { id: 'defect', label: 'Defects' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'adblue', label: 'AdBlue' },
  { id: 'document', label: 'Documents' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'tyre', label: 'Tyres' },
  { id: 'report', label: 'Reports' },
]
