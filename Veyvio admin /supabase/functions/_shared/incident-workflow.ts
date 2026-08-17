/**
 * P0-07 — incident acknowledgement, escalation, and driver receipt proof on Command.
 */
import { companyScopedServiceDbForCompany } from './db-authority.ts'
import { emitDomainEvent } from './domain-events.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { notifyCompanyAdmins } from './notifications.ts'
import {
  appendTimeline,
  mapIncidentDetail,
  mapSeverity,
  parseMetadata,
  validateEscalation,
  type IncidentMetadata,
} from './incident-workflow.mapping.ts'

type Row = Record<string, unknown>

function incidentDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'incident_workflow')
}

export {
  buildDriverIncidentMetadata,
  mapIncidentDetail,
  mapIncidentRegisterRow,
  type IncidentMetadata,
  type IncidentTimelineEntry,
} from './incident-workflow.mapping.ts'

async function loadIncident(companyId: string, incidentId: string) {
  const { data, error } = await incidentDb(companyId)
    .from('incidents')
    .select('*, vehicles(registration, make, model), drivers(driver_number)')
    .eq('company_id', companyId)
    .eq('id', incidentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Row | null
}

export async function getIncidentDetail(companyId: string, incidentId: string) {
  const row = await loadIncident(companyId, incidentId)
  if (!row) return null
  const { data: depot } = await incidentDb(companyId)
    .from('depots')
    .select('id, name')
    .eq('company_id', companyId)
    .limit(1)
    .maybeSingle()
  return mapIncidentDetail(row, depot)
}

export async function acknowledgeIncident(input: {
  companyId: string
  incidentId: string
  actorUserId: string
  actorName: string
  notes?: string | null
}) {
  const companyId = input.companyId
  const row = await loadIncident(companyId, input.incidentId)
  if (!row) throw new Error('Incident not found')

  const meta = parseMetadata(row.metadata)
  if (meta.acknowledgedAt) {
    const { data: depot } = await incidentDb(companyId).from('depots').select('id, name').eq('company_id', input.companyId).limit(1).maybeSingle()
    return mapIncidentDetail(row, depot)
  }

  const now = new Date().toISOString()
  let nextMeta = appendTimeline(meta, {
    action: 'acknowledged',
    actorName: input.actorName,
    occurredAt: now,
    detail: input.notes?.trim() || 'Incident acknowledged by operations.',
    isSystem: false,
  })
  nextMeta = {
    ...nextMeta,
    acknowledgedAt: now,
    acknowledgedBy: input.actorUserId,
    acknowledgedByName: input.actorName,
    acknowledgementNotes: input.notes?.trim() || null,
  }

  const { data: updated, error } = await incidentDb(companyId)
    .from('incidents')
    .update({
      metadata: nextMeta,
      status: row.status === 'open' ? 'under_investigation' : row.status,
      updated_at: now,
      updated_by: input.actorUserId,
    })
    .eq('id', input.incidentId)
    .eq('company_id', input.companyId)
    .select('*, vehicles(registration, make, model), drivers(driver_number)')
    .single()

  if (error || !updated) throw new Error(error?.message ?? 'Acknowledgement failed')

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'incident.acknowledged',
    entityType: 'incident',
    entityId: input.incidentId,
    afterSnapshot: { acknowledgedAt: now },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: input.companyId,
    eventType: 'incident.acknowledged',
    entityType: 'incident',
    entityId: input.incidentId,
    actorUserId: input.actorUserId,
    payload: { notes: input.notes ?? null },
  }).catch(() => undefined)

  const { data: depot } = await incidentDb(companyId).from('depots').select('id, name').eq('company_id', input.companyId).limit(1).maybeSingle()
  return mapIncidentDetail(updated as Row, depot)
}

export async function escalateIncident(input: {
  companyId: string
  incidentId: string
  actorUserId: string
  actorName: string
  severity: string
  reason: string
}) {
  const companyId = input.companyId
  const row = await loadIncident(companyId, input.incidentId)
  if (!row) throw new Error('Incident not found')

  const reason = String(input.reason ?? '').trim()
  if (!reason) throw new Error('Reason for escalation is required.')

  const nextSeverity = mapSeverity(input.severity)
  const currentSeverity = mapSeverity(row.severity)
  const escalationCheck = validateEscalation(currentSeverity, nextSeverity)
  if (!escalationCheck.ok) {
    throw new Error(escalationCheck.message)
  }

  const now = new Date().toISOString()
  const meta = appendTimeline(parseMetadata(row.metadata), {
    action: 'escalated',
    actorName: input.actorName,
    occurredAt: now,
    detail: `${nextSeverity.toUpperCase()}: ${reason}`,
    isSystem: false,
  })

  const nextMeta: IncidentMetadata = {
    ...meta,
    escalatedAt: now,
    escalatedBy: input.actorUserId,
    escalatedByName: input.actorName,
    escalationReason: reason,
  }

  const { data: updated, error } = await incidentDb(companyId)
    .from('incidents')
    .update({
      metadata: nextMeta,
      severity: nextSeverity,
      status: nextSeverity === 'critical' ? 'immediate_response' : row.status,
      updated_at: now,
      updated_by: input.actorUserId,
    })
    .eq('id', input.incidentId)
    .eq('company_id', input.companyId)
    .select('*, vehicles(registration, make, model), drivers(driver_number)')
    .single()

  if (error || !updated) throw new Error(error?.message ?? 'Escalation failed')

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'incident.escalated',
    entityType: 'incident',
    entityId: input.incidentId,
    afterSnapshot: { severity: nextSeverity, reason },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: input.companyId,
    eventType: 'incident.escalated',
    entityType: 'incident',
    entityId: input.incidentId,
    actorUserId: input.actorUserId,
    payload: { severity: nextSeverity, reason },
  }).catch(() => undefined)

  if (nextSeverity === 'critical' || String(row.incident_type) === 'safeguarding') {
    await notifyCompanyAdmins({
      companyId: input.companyId,
      type: 'incident.escalated',
      title: 'Incident escalated',
      body: `${String(row.incident_reference)} escalated to ${nextSeverity}. ${reason}`,
      severity: 'critical',
      actionUrl: `/incidents/${input.incidentId}`,
      sourceEntityType: 'incident',
      sourceEntityId: input.incidentId,
      excludeUserId: input.actorUserId,
    })
  }

  const { data: depot } = await incidentDb(companyId).from('depots').select('id, name').eq('company_id', input.companyId).limit(1).maybeSingle()
  return mapIncidentDetail(updated as Row, depot)
}
