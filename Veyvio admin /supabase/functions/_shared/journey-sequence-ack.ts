/**
 * Durable journey-sequence acknowledgements for Command + Driver (F-03).
 *
 * Wave 3F UserScopedDb/RLS cutover 7: membership JWT writes
 * `journey_sequence_acknowledgements` through RLS (SELECT/INSERT/UPDATE).
 * Duty/run lookups stay company-scoped service-role until those tables cut over.
 * Support-grant sessions stay on company-scoped service-role.
 * Audit / driver notify stay privileged.
 */
import { companyScopedServiceDb, resolveTenantDb, userScopedDb } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import { notifyDriverJourneySequenceChanged } from './driver-ops-notifications.ts'
import { parseDutyTripSyntheticId } from './journey-sequence-reorder.mapping.ts'
import {
  canAdvanceJourneyAck,
  isTerminalJourneyAck,
  mapJourneyAckRow,
  type JourneyAckStatus,
  type JourneyDeclineReason,
} from './journey-sequence-ack.mapping.ts'
import type { RequestContext } from './supabase.ts'

function ackLookupDb(companyId: string) {
  return resolveTenantDb(companyId, 'journey_sequence_ack_lookups')
}

function ackTenantDb(context: RequestContext) {
  if (context.workspaceAuthority === 'support') {
    return companyScopedServiceDb(context, 'journey_sequence_ack_support_grant')
  }
  return userScopedDb(context, 'journey_sequence_ack')
}

async function resolveDriverIdForAck(input: {
  companyId: string
  dutyId?: string | null
  runId?: string | null
  tripKey: string
}): Promise<string | null> {
  const dutyId = input.dutyId ?? parseDutyTripSyntheticId(input.tripKey)
  if (dutyId) {
    const { data: duty } = await ackLookupDb(input.companyId)
      .from('duties')
      .select('driver_id')
      .eq('company_id', input.companyId)
      .eq('id', dutyId)
      .maybeSingle()
    if (duty?.driver_id) return String(duty.driver_id)
  }
  if (input.runId) {
    const { data: run } = await ackLookupDb(input.companyId)
      .from('runs')
      .select('driver_id')
      .eq('company_id', input.companyId)
      .eq('id', input.runId)
      .maybeSingle()
    if (run?.driver_id) return String(run.driver_id)

    const { data: link } = await ackLookupDb(input.companyId)
      .from('duty_runs')
      .select('duty_id')
      .eq('run_id', input.runId)
      .limit(1)
      .maybeSingle()
    if (link?.duty_id) {
      const { data: duty } = await ackLookupDb(input.companyId)
        .from('duties')
        .select('driver_id')
        .eq('company_id', input.companyId)
        .eq('id', String(link.duty_id))
        .maybeSingle()
      if (duty?.driver_id) return String(duty.driver_id)
    }
  }
  return null
}

export async function getJourneySequenceAcknowledgement(input: {
  context: RequestContext
  tripKey: string
}) {
  const companyId = input.context.companyId
  const { data, error } = await ackTenantDb(input.context)
    .from('journey_sequence_acknowledgements')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_key', input.tripKey)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const mapped = mapJourneyAckRow(data as Record<string, unknown>)
  if (mapped.status === 'not_required') return null
  return mapped
}

export async function ensureJourneySequenceAcknowledgement(input: {
  context: RequestContext
  actorUserId: string
  tripKey: string
  summary: string
  required: boolean
  dutyId?: string | null
  runId?: string | null
}) {
  if (!input.required) {
    return null
  }

  const companyId = input.context.companyId
  const existing = await getJourneySequenceAcknowledgement({
    context: input.context,
    tripKey: input.tripKey,
  })
  if (existing && !isTerminalJourneyAck(existing.status)) {
    return existing
  }

  const now = new Date().toISOString()
  const dutyId = input.dutyId ?? parseDutyTripSyntheticId(input.tripKey)
  const { data, error } = await ackTenantDb(input.context)
    .from('journey_sequence_acknowledgements')
    .upsert(
      {
        company_id: companyId,
        trip_key: input.tripKey,
        duty_id: dutyId,
        run_id: input.runId ?? null,
        status: 'sent',
        summary: input.summary,
        decline_reason: null,
        escalate_after_minutes: 10,
        sent_at: now,
        delivered_at: now,
        viewed_at: null,
        acknowledged_at: null,
        declined_at: null,
        created_at: now,
        updated_at: now,
        created_by: input.actorUserId,
        updated_by: input.actorUserId,
      },
      { onConflict: 'company_id,trip_key' },
    )
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Acknowledgement could not be saved')
  const mapped = mapJourneyAckRow(data as Record<string, unknown>)

  // F-29: push must not create business state — ack row above is the source of truth.
  try {
    const driverId = await resolveDriverIdForAck({
      companyId,
      dutyId,
      runId: input.runId,
      tripKey: input.tripKey,
    })
    if (driverId) {
      await notifyDriverJourneySequenceChanged({
        companyId,
        driverId,
        tripKey: input.tripKey,
        summary: input.summary,
      })
    }
  } catch (notifyError) {
    console.error('journey sequence ack notify failed', notifyError)
  }

  return mapped
}

export async function advanceJourneySequenceAcknowledgement(input: {
  context: RequestContext
  actorUserId: string
  tripKey: string
  nextStatus: 'viewed' | 'acknowledged' | 'declined' | 'delivered'
  declineReason?: JourneyDeclineReason | null
}) {
  const companyId = input.context.companyId
  const { data: row, error } = await ackTenantDb(input.context)
    .from('journey_sequence_acknowledgements')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_key', input.tripKey)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) throw new HttpError(404, 'No acknowledgement pending for this trip', 'ack_not_found')

  const current = String(row.status) as JourneyAckStatus
  const next = input.nextStatus as JourneyAckStatus
  if (!canAdvanceJourneyAck(current, next)) {
    throw new HttpError(
      409,
      `Cannot move acknowledgement from ${current} to ${next}`,
      'ack_transition_blocked',
    )
  }
  if (next === 'declined' && !String(input.declineReason ?? '').trim()) {
    throw new HttpError(400, 'Decline reason is required', 'decline_reason_required')
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: next,
    updated_at: now,
    updated_by: input.actorUserId,
  }
  if (next === 'delivered') patch.delivered_at = row.delivered_at ?? now
  if (next === 'viewed' || next === 'acknowledged' || next === 'declined') {
    patch.viewed_at = row.viewed_at ?? now
  }
  if (next === 'acknowledged') patch.acknowledged_at = now
  if (next === 'declined') {
    patch.declined_at = now
    patch.decline_reason = input.declineReason ?? 'other'
  }

  const { data: updated, error: updateError } = await ackTenantDb(input.context)
    .from('journey_sequence_acknowledgements')
    .update(patch)
    .eq('company_id', companyId)
    .eq('trip_key', input.tripKey)
    .select('*')
    .single()
  if (updateError || !updated) {
    throw new Error(updateError?.message ?? 'Acknowledgement could not be updated')
  }

  await writeImmutableAudit({
    companyId,
    actorUserId: input.actorUserId,
    action: 'journey_sequence.acknowledgement',
    entityType: 'journey_sequence_acknowledgement',
    entityId: String(updated.id),
    reason: next === 'declined' ? String(input.declineReason ?? 'other') : next,
    beforeSnapshot: { status: current },
    afterSnapshot: { status: next },
  })

  return mapJourneyAckRow(updated as Record<string, unknown>)
}

/** Assigned / active trips require driver acknowledgement when notifications are sent. */
export function journeyAckRequiredForTripStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? '').toLowerCase()
  return ['assigned', 'accepted', 'released', 'in_progress'].includes(normalized)
}

async function assertDriverOwnsAck(input: {
  companyId: string
  driverId: string
  row: Record<string, unknown>
}) {
  const owner = await resolveDriverIdForAck({
    companyId: input.companyId,
    dutyId: input.row.duty_id ? String(input.row.duty_id) : null,
    runId: input.row.run_id ? String(input.row.run_id) : null,
    tripKey: String(input.row.trip_key),
  })
  if (!owner || owner !== input.driverId) {
    throw new HttpError(403, 'This acknowledgement is not assigned to you', 'forbidden')
  }
}

export async function listPendingJourneySequenceAcksForDriver(input: {
  context: RequestContext
  driverId: string
}) {
  const companyId = input.context.companyId
  const { data: duties, error: dutyError } = await ackLookupDb(companyId)
    .from('duties')
    .select('id')
    .eq('company_id', companyId)
    .eq('driver_id', input.driverId)
  if (dutyError) throw new Error(dutyError.message)
  const dutyIds = (duties ?? []).map((d) => String(d.id))

  const runIdSet = new Set<string>()
  const { data: runs, error: runError } = await ackLookupDb(companyId)
    .from('runs')
    .select('id')
    .eq('company_id', companyId)
    .eq('driver_id', input.driverId)
  if (runError) throw new Error(runError.message)
  for (const run of runs ?? []) runIdSet.add(String(run.id))

  if (dutyIds.length) {
    const { data: links, error: linkError } = await ackLookupDb(companyId)
      .from('duty_runs')
      .select('run_id')
      .in('duty_id', dutyIds)
    if (linkError) throw new Error(linkError.message)
    for (const link of links ?? []) {
      if (link.run_id) runIdSet.add(String(link.run_id))
    }
  }
  const runIds = [...runIdSet]

  if (!dutyIds.length && !runIds.length) return []

  const { data, error } = await ackTenantDb(input.context)
    .from('journey_sequence_acknowledgements')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['sent', 'delivered', 'viewed'])
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? [])
    .filter((row) => {
      const dutyId = row.duty_id ? String(row.duty_id) : null
      const runId = row.run_id ? String(row.run_id) : null
      if (dutyId && dutyIds.includes(dutyId)) return true
      if (runId && runIds.includes(runId)) return true
      const synthetic = parseDutyTripSyntheticId(String(row.trip_key))
      return Boolean(synthetic && dutyIds.includes(synthetic))
    })
    .map((row) => mapJourneyAckRow(row as Record<string, unknown>))
}

export async function driverAdvanceJourneySequenceAcknowledgement(input: {
  context: RequestContext
  actorUserId: string
  driverId: string
  tripKey: string
  nextStatus: 'viewed' | 'acknowledged' | 'declined' | 'delivered'
  declineReason?: JourneyDeclineReason | null
}) {
  const companyId = input.context.companyId
  const { data: row, error } = await ackTenantDb(input.context)
    .from('journey_sequence_acknowledgements')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_key', input.tripKey)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) throw new HttpError(404, 'No acknowledgement pending for this trip', 'ack_not_found')
  await assertDriverOwnsAck({
    companyId,
    driverId: input.driverId,
    row: row as Record<string, unknown>,
  })
  return advanceJourneySequenceAcknowledgement({
    context: input.context,
    actorUserId: input.actorUserId,
    tripKey: input.tripKey,
    nextStatus: input.nextStatus,
    declineReason: input.declineReason,
  })
}
