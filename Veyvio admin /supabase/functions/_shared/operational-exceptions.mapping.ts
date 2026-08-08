/**
 * Pure mapping + transition rules for operational exception cases (F-18).
 */

export type ExceptionCaseStatus =
  | 'new'
  | 'acknowledged'
  | 'assigned'
  | 'investigating'
  | 'action_in_progress'
  | 'awaiting_external'
  | 'monitoring'
  | 'resolved'
  | 'dismissed'
  | 'reopened'

export type ExceptionCaseSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ExceptionCaseCategory =
  | 'driver'
  | 'vehicle'
  | 'journey'
  | 'customer'
  | 'dispatch'
  | 'compliance'
  | 'yard'

const TERMINAL = new Set<ExceptionCaseStatus>(['resolved', 'dismissed'])

const ALLOWED: Record<ExceptionCaseStatus, ExceptionCaseStatus[]> = {
  new: ['acknowledged', 'assigned', 'investigating', 'action_in_progress', 'resolved', 'dismissed'],
  acknowledged: ['assigned', 'investigating', 'action_in_progress', 'resolved', 'dismissed'],
  assigned: ['investigating', 'action_in_progress', 'awaiting_external', 'monitoring', 'resolved', 'dismissed'],
  investigating: ['assigned', 'action_in_progress', 'awaiting_external', 'monitoring', 'resolved', 'dismissed'],
  action_in_progress: ['investigating', 'awaiting_external', 'monitoring', 'resolved', 'dismissed'],
  awaiting_external: ['investigating', 'action_in_progress', 'monitoring', 'resolved', 'dismissed'],
  monitoring: ['investigating', 'action_in_progress', 'resolved', 'dismissed'],
  resolved: ['reopened'],
  dismissed: ['reopened'],
  reopened: ['acknowledged', 'assigned', 'investigating', 'action_in_progress', 'resolved', 'dismissed'],
}

export function canTransitionExceptionStatus(
  current: ExceptionCaseStatus,
  next: ExceptionCaseStatus,
): boolean {
  if (current === next) return true
  return (ALLOWED[current] ?? []).includes(next)
}

export function isTerminalExceptionStatus(status: ExceptionCaseStatus): boolean {
  return TERMINAL.has(status)
}

export function normalizeExceptionStatus(raw: string | null | undefined): ExceptionCaseStatus {
  const value = String(raw ?? 'new').toLowerCase()
  if (value === 'open') return 'new'
  if ((ALLOWED as Record<string, unknown>)[value]) return value as ExceptionCaseStatus
  return 'new'
}

export function normalizeExceptionSeverity(raw: string | null | undefined): ExceptionCaseSeverity {
  const value = String(raw ?? 'medium').toLowerCase()
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') return value
  return 'medium'
}

export function normalizeExceptionCategory(raw: string | null | undefined): ExceptionCaseCategory {
  const value = String(raw ?? 'dispatch').toLowerCase()
  if (
    value === 'driver' ||
    value === 'vehicle' ||
    value === 'journey' ||
    value === 'customer' ||
    value === 'dispatch' ||
    value === 'compliance' ||
    value === 'yard'
  ) {
    return value
  }
  return 'dispatch'
}

export type ExceptionEventRow = {
  id: string
  event_type: string
  actor_name?: string | null
  body?: string | null
  created_at: string
  payload?: Record<string, unknown> | null
}

export function mapExceptionCase(
  row: Record<string, unknown>,
  events: ExceptionEventRow[] = [],
  ownerName: string | null = null,
): {
  id: string
  severity: ExceptionCaseSeverity
  title: string
  category: ExceptionCaseCategory
  typeCode: string
  description: string
  relatedRecord: string
  relatedHref: string
  depot: string
  raisedAt: string
  ageMinutes: number
  slaMinutesRemaining: number | null
  owner: string | null
  status: ExceptionCaseStatus
  lastUpdate: string
  source: 'Command'
  escalated: boolean
  assignedToUserId: string | null
  durableCase: true
  notes: { id: string; at: string; author: string; body: string }[]
  timeline: { at: string; label: string }[]
  audit: { id: string; at: string; actor: string; action: string }[]
} {
  const detectedAt = String(row.detected_at ?? row.created_at ?? new Date().toISOString())
  const updatedAt = String(row.updated_at ?? detectedAt)
  const status = normalizeExceptionStatus(String(row.status ?? 'new'))
  const dueAt = row.resolution_due_at ? String(row.resolution_due_at) : null
  let slaMinutesRemaining: number | null = null
  if (dueAt && !isTerminalExceptionStatus(status)) {
    slaMinutesRemaining = Math.round((new Date(dueAt).getTime() - Date.now()) / 60_000)
  }

  const notes = events
    .filter((e) => e.event_type === 'note')
    .map((e) => ({
      id: e.id,
      at: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: String(e.actor_name ?? 'Operations'),
      body: String(e.body ?? ''),
    }))

  const timeline = events.map((e) => ({
    at: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    label: String(e.body ?? e.event_type.replace(/_/g, ' ')),
  }))

  const audit = events.map((e) => ({
    id: e.id,
    at: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actor: String(e.actor_name ?? 'System'),
    action: String(e.event_type.replace(/_/g, ' ')),
  }))

  return {
    id: String(row.id),
    severity: normalizeExceptionSeverity(String(row.severity ?? 'medium')),
    title: String(row.title ?? 'Operational exception'),
    category: normalizeExceptionCategory(String(row.category ?? 'dispatch')),
    typeCode: String(row.type_code ?? row.type ?? 'manual_exception'),
    description: String(row.description ?? row.title ?? ''),
    relatedRecord: String(row.related_record ?? row.source_entity_id ?? row.id),
    relatedHref: String(row.related_href ?? '/exceptions'),
    depot: String((row as { depot_name?: string }).depot_name ?? '—'),
    raisedAt: new Date(detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ageMinutes: Math.max(0, Math.round((Date.now() - new Date(detectedAt).getTime()) / 60_000)),
    slaMinutesRemaining,
    owner: ownerName,
    status,
    lastUpdate: new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    source: 'Command',
    escalated: Boolean(row.escalated),
    assignedToUserId: row.owner_id ? String(row.owner_id) : null,
    durableCase: true,
    notes,
    timeline,
    audit,
  }
}
