/**
 * Durable operational exception cases — sole Command write path (F-18).
 *
 * Wave 3F UserScopedDb/RLS cutover 10+23: membership JWT reads/writes
 * `operational_exceptions` (SELECT/INSERT/UPDATE) and appends
 * `operational_exception_events` (SELECT/INSERT). Support-grant sessions stay on
 * company-scoped service-role. User display-name and depot lookups stay
 * service-role. Defect automation raises without a membership JWT and uses
 * company-scoped service-role. writeImmutableAudit stays privileged.
 */
import { companyScopedServiceDb, resolveTenantDb, userScopedDb } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import {
  canTransitionExceptionStatus,
  isTerminalExceptionStatus,
  mapExceptionCase,
  normalizeExceptionCategory,
  normalizeExceptionSeverity,
  normalizeExceptionStatus,
  type ExceptionCaseCategory,
  type ExceptionCaseSeverity,
  type ExceptionCaseStatus,
  type ExceptionEventRow,
} from './operational-exceptions.mapping.ts'
import type { RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

type ExceptionScope = {
  companyId: string
  context?: RequestContext
}

function exceptionTenantDb(scope: ExceptionScope) {
  const companyId = scope.context?.companyId ?? scope.companyId
  if (scope.context?.workspaceAuthority === 'support') {
    return companyScopedServiceDb(scope.context, 'operational_exceptions_support_grant')
  }
  if (scope.context) {
    return userScopedDb(scope.context, 'operational_exceptions')
  }
  return resolveTenantDb(companyId, 'operational_exceptions')
}

function exceptionSideEffectsDb(scope: ExceptionScope) {
  if (scope.context) {
    return companyScopedServiceDb(scope.context, 'operational_exception_side_effects')
  }
  return resolveTenantDb(scope.companyId, 'operational_exception_side_effects')
}

function scopeFrom(input: { context?: RequestContext; companyId: string }): ExceptionScope {
  return { companyId: input.context?.companyId ?? input.companyId, context: input.context }
}

async function loadEvents(scope: ExceptionScope, exceptionId: string): Promise<ExceptionEventRow[]> {
  const companyId = scope.companyId
  const { data, error } = await exceptionTenantDb(scope)
    .from('operational_exception_events')
    .select('id, event_type, actor_name, body, created_at, payload')
    .eq('company_id', companyId)
    .eq('exception_id', exceptionId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ExceptionEventRow[]
}

async function resolveOwnerName(scope: ExceptionScope, ownerId: string | null | undefined): Promise<string | null> {
  if (!ownerId) return null
  const { data } = await exceptionSideEffectsDb(scope)
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', ownerId)
    .maybeSingle()
  if (!data) return null
  const name = `${String(data.first_name ?? '')} ${String(data.last_name ?? '')}`.trim()
  return name || String(data.email ?? null)
}

async function appendEvent(input: {
  scope: ExceptionScope
  exceptionId: string
  eventType: string
  actorUserId: string
  actorName: string
  body?: string | null
  payload?: Record<string, unknown>
}) {
  const { error } = await exceptionTenantDb(input.scope).from('operational_exception_events').insert({
    company_id: input.scope.companyId,
    exception_id: input.exceptionId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId,
    actor_name: input.actorName,
    body: input.body ?? null,
    payload: input.payload ?? {},
  })
  if (error) throw new Error(error.message)
}

async function loadCase(scope: ExceptionScope, exceptionId: string): Promise<Row | null> {
  const companyId = scope.companyId
  const { data, error } = await exceptionTenantDb(scope)
    .from('operational_exceptions')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', exceptionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const { data: depot } = data.depot_id
    ? await exceptionSideEffectsDb(scope)
        .from('depots')
        .select('name')
        .eq('company_id', companyId)
        .eq('id', String(data.depot_id))
        .maybeSingle()
    : { data: null }
  return { ...data, depot_name: depot?.name ?? null }
}

export async function getOperationalException(
  input: { context?: RequestContext; companyId: string },
  exceptionId: string,
) {
  const scope = scopeFrom(input)
  const row = await loadCase(scope, exceptionId)
  if (!row) return null
  const events = await loadEvents(scope, exceptionId)
  const ownerName = await resolveOwnerName(scope, row.owner_id ? String(row.owner_id) : null)
  return mapExceptionCase(row, events, ownerName)
}

export async function listOperationalExceptions(input: {
  context?: RequestContext
  companyId: string
  status?: string | null
  openOnly?: boolean
}) {
  const scope = scopeFrom(input)
  let query = exceptionTenantDb(scope)
    .from('operational_exceptions')
    .select('*')
    .eq('company_id', scope.companyId)
    .order('detected_at', { ascending: false })
    .limit(200)

  if (input.status) {
    query = query.eq('status', normalizeExceptionStatus(input.status))
  } else if (input.openOnly !== false) {
    query = query.not('status', 'in', '(resolved,dismissed)')
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  if (!rows.length) return []

  const ids = rows.map((row) => String(row.id))
  const { data: eventRows, error: eventError } = await exceptionTenantDb(scope)
    .from('operational_exception_events')
    .select('id, exception_id, event_type, actor_name, body, created_at, payload')
    .eq('company_id', scope.companyId)
    .in('exception_id', ids)
    .order('created_at', { ascending: true })
  if (eventError) throw new Error(eventError.message)

  const eventsByCase = new Map<string, ExceptionEventRow[]>()
  for (const event of eventRows ?? []) {
    const key = String(event.exception_id)
    const list = eventsByCase.get(key) ?? []
    list.push(event as ExceptionEventRow)
    eventsByCase.set(key, list)
  }

  const depotIds = [...new Set(rows.map((row) => row.depot_id).filter(Boolean).map(String))]
  const { data: depots } = depotIds.length
    ? await exceptionSideEffectsDb(scope).from('depots').select('id, name').eq('company_id', scope.companyId).in('id', depotIds)
    : { data: [] as Row[] }
  const depotById = new Map((depots ?? []).map((depot) => [String(depot.id), depot.name]))

  const results = []
  for (const row of rows) {
    const ownerName = await resolveOwnerName(scope, row.owner_id ? String(row.owner_id) : null)
    results.push(
      mapExceptionCase(
        { ...row, depot_name: depotById.get(String(row.depot_id ?? '')) ?? null },
        eventsByCase.get(String(row.id)) ?? [],
        ownerName,
      ),
    )
  }
  return results
}

export async function raiseOperationalException(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  title: string
  description?: string | null
  severity?: ExceptionCaseSeverity | string
  category?: ExceptionCaseCategory | string
  typeCode?: string
  sourceEntityType?: string | null
  sourceEntityId?: string | null
  depotId?: string | null
  relatedRecord?: string | null
  relatedHref?: string | null
  slaMinutes?: number | null
}) {
  const scope = scopeFrom(input)
  const title = String(input.title ?? '').trim()
  if (!title) throw new HttpError(400, 'Exception title is required', 'title_required')

  const now = new Date().toISOString()
  const slaMinutes = input.slaMinutes ?? 30
  const dueAt = new Date(Date.now() + slaMinutes * 60_000).toISOString()
  const typeCode = String(input.typeCode ?? 'manual_exception').trim() || 'manual_exception'

  const { data, error } = await exceptionTenantDb(scope)
    .from('operational_exceptions')
    .insert({
      company_id: scope.companyId,
      type: typeCode,
      type_code: typeCode,
      category: normalizeExceptionCategory(input.category),
      severity: normalizeExceptionSeverity(input.severity),
      status: 'new',
      title,
      description: input.description?.trim() || title,
      source_entity_type: input.sourceEntityType ?? 'manual',
      source_entity_id: input.sourceEntityId ?? null,
      depot_id: input.depotId ?? null,
      related_record: input.relatedRecord ?? title,
      related_href: input.relatedHref ?? '/exceptions',
      detected_at: now,
      owner_id: input.actorUserId,
      resolution_due_at: dueAt,
      escalated: false,
      created_by: input.actorUserId,
      updated_by: input.actorUserId,
      source_app: 'COMMAND',
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Exception could not be raised')

  await appendEvent({
    scope,
    exceptionId: String(data.id),
    eventType: 'raised',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Exception raised: ${title}`,
  })

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: 'exception.raised',
    entityType: 'operational_exception',
    entityId: String(data.id),
    reason: title,
    afterSnapshot: { status: 'new', title },
  })

  return getOperationalException(input, String(data.id))
}

async function transitionCase(input: {
  context?: RequestContext
  companyId: string
  exceptionId: string
  actorUserId: string
  actorName: string
  nextStatus: ExceptionCaseStatus
  eventType: string
  body?: string | null
  patch?: Record<string, unknown>
}) {
  const scope = scopeFrom(input)
  const row = await loadCase(scope, input.exceptionId)
  if (!row) throw new HttpError(404, 'Exception not found', 'not_found')

  const current = normalizeExceptionStatus(String(row.status))
  if (!canTransitionExceptionStatus(current, input.nextStatus)) {
    throw new HttpError(
      409,
      `Cannot move exception from ${current} to ${input.nextStatus}`,
      'transition_blocked',
    )
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: input.nextStatus,
    updated_at: now,
    updated_by: input.actorUserId,
    version: Number(row.version ?? 1) + 1,
    ...(input.patch ?? {}),
  }
  if (isTerminalExceptionStatus(input.nextStatus)) {
    patch.resolved_at = now
    if (!patch.resolution) patch.resolution = input.body ?? input.nextStatus
  }
  if (input.nextStatus === 'reopened') {
    patch.resolved_at = null
    patch.resolution = null
  }

  const { error } = await exceptionTenantDb(scope)
    .from('operational_exceptions')
    .update(patch)
    .eq('company_id', scope.companyId)
    .eq('id', input.exceptionId)
  if (error) throw new Error(error.message)

  await appendEvent({
    scope,
    exceptionId: input.exceptionId,
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: input.body ?? `${current} → ${input.nextStatus}`,
    payload: { from: current, to: input.nextStatus },
  })

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: `exception.${input.eventType}`,
    entityType: 'operational_exception',
    entityId: input.exceptionId,
    reason: input.body ?? input.nextStatus,
    beforeSnapshot: { status: current },
    afterSnapshot: { status: input.nextStatus },
  })

  return getOperationalException(input, input.exceptionId)
}

export async function acknowledgeOperationalException(input: {
  context?: RequestContext
  companyId: string
  exceptionId: string
  actorUserId: string
  actorName: string
  notes?: string | null
}) {
  return transitionCase({
    ...input,
    nextStatus: 'acknowledged',
    eventType: 'acknowledged',
    body: input.notes?.trim() || 'Exception acknowledged',
  })
}

export async function assignOperationalException(input: {
  context?: RequestContext
  companyId: string
  exceptionId: string
  actorUserId: string
  actorName: string
  assigneeUserId?: string | null
  assigneeName?: string | null
}) {
  const assignee = input.assigneeUserId?.trim() || input.actorUserId
  return transitionCase({
    context: input.context,
    companyId: input.companyId,
    exceptionId: input.exceptionId,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    nextStatus: 'assigned',
    eventType: 'assigned',
    body: `Assigned to ${input.assigneeName?.trim() || input.actorName}`,
    patch: { owner_id: assignee },
  })
}

export async function investigateOperationalException(input: {
  context?: RequestContext
  companyId: string
  exceptionId: string
  actorUserId: string
  actorName: string
}) {
  return transitionCase({
    ...input,
    nextStatus: 'investigating',
    eventType: 'investigating',
    body: 'Marked investigating',
  })
}

export async function escalateOperationalException(input: {
  context?: RequestContext
  companyId: string
  exceptionId: string
  actorUserId: string
  actorName: string
  reason?: string | null
}) {
  return transitionCase({
    context: input.context,
    companyId: input.companyId,
    exceptionId: input.exceptionId,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    nextStatus: 'action_in_progress',
    eventType: 'escalated',
    body: input.reason?.trim() || 'Escalated for senior attention',
    patch: { escalated: true },
  })
}

export async function closeOperationalException(input: {
  context?: RequestContext
  companyId: string
  exceptionId: string
  actorUserId: string
  actorName: string
  resolution?: string | null
  dismiss?: boolean
}) {
  return transitionCase({
    context: input.context,
    companyId: input.companyId,
    exceptionId: input.exceptionId,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    nextStatus: input.dismiss ? 'dismissed' : 'resolved',
    eventType: 'closed',
    body: input.resolution?.trim() || (input.dismiss ? 'Dismissed' : 'Resolved'),
    patch: { resolution: input.resolution?.trim() || (input.dismiss ? 'dismissed' : 'resolved') },
  })
}

export async function addOperationalExceptionNote(input: {
  context?: RequestContext
  companyId: string
  exceptionId: string
  actorUserId: string
  actorName: string
  body: string
}) {
  const text = String(input.body ?? '').trim()
  if (!text) throw new HttpError(400, 'Note body is required', 'note_required')
  const scope = scopeFrom(input)
  const row = await loadCase(scope, input.exceptionId)
  if (!row) throw new HttpError(404, 'Exception not found', 'not_found')

  await appendEvent({
    scope,
    exceptionId: input.exceptionId,
    eventType: 'note',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: text,
  })

  await exceptionTenantDb(scope)
    .from('operational_exceptions')
    .update({
      updated_at: new Date().toISOString(),
      updated_by: input.actorUserId,
    })
    .eq('company_id', scope.companyId)
    .eq('id', input.exceptionId)

  return getOperationalException(input, input.exceptionId)
}
