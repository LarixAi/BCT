/**
 * Durable journey-sequence acknowledgements for Command (F-03).
 */
import { admin } from './supabase.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import { parseDutyTripSyntheticId } from './journey-sequence-reorder.mapping.ts'
import {
  canAdvanceJourneyAck,
  isTerminalJourneyAck,
  mapJourneyAckRow,
  type JourneyAckStatus,
  type JourneyDeclineReason,
} from './journey-sequence-ack.mapping.ts'

export async function getJourneySequenceAcknowledgement(input: {
  companyId: string
  tripKey: string
}) {
  const { data, error } = await admin
    .from('journey_sequence_acknowledgements')
    .select('*')
    .eq('company_id', input.companyId)
    .eq('trip_key', input.tripKey)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const mapped = mapJourneyAckRow(data as Record<string, unknown>)
  if (mapped.status === 'not_required') return null
  return mapped
}

export async function ensureJourneySequenceAcknowledgement(input: {
  companyId: string
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

  const existing = await getJourneySequenceAcknowledgement({
    companyId: input.companyId,
    tripKey: input.tripKey,
  })
  if (existing && !isTerminalJourneyAck(existing.status)) {
    return existing
  }

  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('journey_sequence_acknowledgements')
    .upsert(
      {
        company_id: input.companyId,
        trip_key: input.tripKey,
        duty_id: input.dutyId ?? parseDutyTripSyntheticId(input.tripKey),
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
  return mapJourneyAckRow(data as Record<string, unknown>)
}

export async function advanceJourneySequenceAcknowledgement(input: {
  companyId: string
  actorUserId: string
  tripKey: string
  nextStatus: 'viewed' | 'acknowledged' | 'declined' | 'delivered'
  declineReason?: JourneyDeclineReason | null
}) {
  const { data: row, error } = await admin
    .from('journey_sequence_acknowledgements')
    .select('*')
    .eq('company_id', input.companyId)
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

  const { data: updated, error: updateError } = await admin
    .from('journey_sequence_acknowledgements')
    .update(patch)
    .eq('company_id', input.companyId)
    .eq('trip_key', input.tripKey)
    .select('*')
    .single()
  if (updateError || !updated) {
    throw new Error(updateError?.message ?? 'Acknowledgement could not be updated')
  }

  await writeImmutableAudit({
    companyId: input.companyId,
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
