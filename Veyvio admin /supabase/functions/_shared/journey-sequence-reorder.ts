/**
 * Durable journey-sequence reorder for Command (F-03).
 * Updates run_trips.sequence or trips.passenger_ids, bumps versions, audits.
 */
import { companyScopedServiceDbForCompany } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import {
  canReorderTripStatus,
  parseDutyTripSyntheticId,
  planPassengerReorder,
  planRunTripReorder,
} from './journey-sequence-reorder.mapping.ts'

type Row = Record<string, unknown>

function reorderDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'journey_sequence_reorder')
}

const REASONS = new Set([
  'traffic_or_road_closure',
  'passenger_requirement',
  'late_running_recovery',
  'vehicle_capacity',
  'driver_request',
  'school_request',
  'parent_carer_request',
  'operational_optimisation',
  'safeguarding_requirement',
  'other',
])

async function loadRunTripOrder(companyId: string, runId: string): Promise<Array<{ tripId: string; sequence: number }>> {
  const { data, error } = await reorderDb(companyId)
    .from('run_trips')
    .select('trip_id, sequence')
    .eq('run_id', runId)
    .order('sequence', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    tripId: String(row.trip_id),
    sequence: Number(row.sequence),
  }))
}

async function applyRunTripOrder(companyId: string, runId: string, orderedTripIds: string[]) {
  // Unique (run_id, sequence) — move to temporary negative sequences first.
  for (let i = 0; i < orderedTripIds.length; i++) {
    const { error } = await reorderDb(companyId)
      .from('run_trips')
      .update({ sequence: -(i + 1) })
      .eq('run_id', runId)
      .eq('trip_id', orderedTripIds[i]!)
    if (error) throw new Error(error.message)
  }
  for (let i = 0; i < orderedTripIds.length; i++) {
    const { error } = await reorderDb(companyId)
      .from('run_trips')
      .update({ sequence: i + 1 })
      .eq('run_id', runId)
      .eq('trip_id', orderedTripIds[i]!)
    if (error) throw new Error(error.message)
  }
}

async function resolveDutyContext(companyId: string, dutyId: string) {
  const { data: duty, error } = await reorderDb(companyId)
    .from('duties')
    .select('id, company_id, status, version')
    .eq('company_id', companyId)
    .eq('id', dutyId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!duty) throw new HttpError(404, 'Duty not found', 'not_found')

  const { data: dutyRuns, error: dutyRunError } = await reorderDb(companyId)
    .from('duty_runs')
    .select('run_id, sequence')
    .eq('duty_id', dutyId)
    .order('sequence', { ascending: true })
  if (dutyRunError) throw new Error(dutyRunError.message)
  const runId = dutyRuns?.[0]?.run_id ? String(dutyRuns[0].run_id) : null
  if (!runId) throw new HttpError(409, 'Duty has no run to reorder', 'duty_has_no_run')

  return { duty, runId }
}

async function resolveTripRow(companyId: string, tripId: string) {
  const { data, error } = await reorderDb(companyId)
    .from('trips')
    .select('id, company_id, status, version, passenger_ids, planned_pickup_at')
    .eq('company_id', companyId)
    .eq('id', tripId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Row | null
}

export async function commitJourneySequenceReorder(input: {
  companyId: string
  actorUserId: string
  tripId: string
  orderedPickupJobIds: string[]
  reason: string
  reasonNotes?: string | null
  linkedReturnDecision?: string | null
  sendNotifications?: boolean
  actorName?: string | null
  dutyId?: string | null
}): Promise<{
  mode: 'run_trips' | 'passenger_ids'
  entityId: string
  originalOrder: string[]
  newOrder: string[]
  changed: boolean
  auditId: string
}> {
  const companyId = input.companyId
  const reason = String(input.reason ?? '').trim()
  if (!REASONS.has(reason)) {
    throw new HttpError(400, 'A recognised reorganise reason is required', 'invalid_reason')
  }
  if (reason === 'other' && !String(input.reasonNotes ?? '').trim()) {
    throw new HttpError(400, 'Notes are required when reason is other', 'reason_notes_required')
  }

  const syntheticDutyId = parseDutyTripSyntheticId(input.tripId)
  const dutyId = input.dutyId?.trim() || syntheticDutyId

  if (dutyId) {
    const { duty, runId } = await resolveDutyContext(input.companyId, dutyId)
    if (!canReorderTripStatus(mapDutyStatus(String(duty.status)))) {
      throw new HttpError(409, 'This duty cannot be reorganised in its current status', 'reorder_blocked')
    }
    const current = await loadRunTripOrder(companyId, runId)
    if (current.length < 2) {
      throw new HttpError(409, 'Need at least two pickup trips on the run to reorder', 'insufficient_pickups')
    }
    const plan = planRunTripReorder({
      currentTripIdsInSequence: current.map((row) => row.tripId),
      orderedPickupJobIds: input.orderedPickupJobIds,
    })
    if (plan.changed) {
      await applyRunTripOrder(companyId, runId, plan.orderedTripIds)
      const { data: runRow } = await reorderDb(companyId).from('runs').select('version').eq('id', runId).maybeSingle()
      await reorderDb(companyId)
        .from('runs')
        .update({
          updated_at: new Date().toISOString(),
          version: Number(runRow?.version ?? 1) + 1,
        })
        .eq('id', runId)
        .eq('company_id', input.companyId)
      await reorderDb(companyId)
        .from('duties')
        .update({
          updated_at: new Date().toISOString(),
          version: Number(duty.version ?? 1) + 1,
        })
        .eq('id', dutyId)
        .eq('company_id', input.companyId)
    }

    const audit = await writeImmutableAudit({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: 'journey_sequence.reorder',
      entityType: 'duty',
      entityId: dutyId,
      reason: input.reasonNotes?.trim() || reason,
      beforeSnapshot: { order: current.map((row) => row.tripId), runId },
      afterSnapshot: {
        order: plan.orderedTripIds,
        runId,
        linkedReturnDecision: input.linkedReturnDecision ?? 'keep_unchanged',
        sendNotifications: Boolean(input.sendNotifications),
        actorName: input.actorName ?? null,
        changed: plan.changed,
      },
    })

    return {
      mode: 'run_trips',
      entityId: dutyId,
      originalOrder: current.map((row) => row.tripId),
      newOrder: plan.orderedTripIds,
      changed: plan.changed,
      auditId: audit.id,
    }
  }

  const trip = await resolveTripRow(input.companyId, input.tripId)
  if (!trip) throw new HttpError(404, 'Trip not found', 'not_found')
  if (!canReorderTripStatus(mapTripStatus(String(trip.status)))) {
    throw new HttpError(409, 'This trip cannot be reorganised in its current status', 'reorder_blocked')
  }

  const { data: runLink } = await reorderDb(companyId)
    .from('run_trips')
    .select('run_id, sequence')
    .eq('trip_id', input.tripId)
    .maybeSingle()

  if (runLink?.run_id) {
    const runId = String(runLink.run_id)
    const current = await loadRunTripOrder(companyId, runId)
    if (current.length >= 2) {
      const plan = planRunTripReorder({
        currentTripIdsInSequence: current.map((row) => row.tripId),
        orderedPickupJobIds: input.orderedPickupJobIds,
      })
      if (plan.changed) await applyRunTripOrder(companyId, runId, plan.orderedTripIds)
      const audit = await writeImmutableAudit({
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        action: 'journey_sequence.reorder',
        entityType: 'run',
        entityId: runId,
        reason: input.reasonNotes?.trim() || reason,
        beforeSnapshot: { order: current.map((row) => row.tripId), tripId: input.tripId },
        afterSnapshot: {
          order: plan.orderedTripIds,
          tripId: input.tripId,
          linkedReturnDecision: input.linkedReturnDecision ?? 'keep_unchanged',
          sendNotifications: Boolean(input.sendNotifications),
          changed: plan.changed,
        },
      })
      if (plan.changed) {
        await reorderDb(companyId)
          .from('trips')
          .update({
            updated_at: new Date().toISOString(),
            version: Number(trip.version ?? 1) + 1,
          })
          .eq('id', input.tripId)
          .eq('company_id', input.companyId)
      }
      return {
        mode: 'run_trips',
        entityId: runId,
        originalOrder: current.map((row) => row.tripId),
        newOrder: plan.orderedTripIds,
        changed: plan.changed,
        auditId: audit.id,
      }
    }
  }

  const passengerIds = ((trip.passenger_ids as string[] | null) ?? []).map(String)
  const plan = planPassengerReorder({
    currentPassengerIds: passengerIds,
    orderedPickupJobIds: input.orderedPickupJobIds,
  })
  if (plan.changed) {
    const { error } = await reorderDb(companyId)
      .from('trips')
      .update({
        passenger_ids: plan.orderedPassengerIds,
        updated_at: new Date().toISOString(),
        version: Number(trip.version ?? 1) + 1,
      })
      .eq('id', input.tripId)
      .eq('company_id', input.companyId)
    if (error) throw new Error(error.message)
  }

  const audit = await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'journey_sequence.reorder',
    entityType: 'trip',
    entityId: input.tripId,
    reason: input.reasonNotes?.trim() || reason,
    beforeSnapshot: { passengerIds },
    afterSnapshot: {
      passengerIds: plan.orderedPassengerIds,
      linkedReturnDecision: input.linkedReturnDecision ?? 'keep_unchanged',
      sendNotifications: Boolean(input.sendNotifications),
      changed: plan.changed,
    },
  })

  return {
    mode: 'passenger_ids',
    entityId: input.tripId,
    originalOrder: passengerIds,
    newOrder: plan.orderedPassengerIds,
    changed: plan.changed,
    auditId: audit.id,
  }
}

function mapDutyStatus(status: string): string {
  if (status === 'completed') return 'completed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'in_progress' || status === 'signed_on') return 'in_progress'
  if (status === 'planned') return 'planned'
  return 'assigned'
}

function mapTripStatus(status: string): string {
  const normalized = status.toLowerCase()
  if (['planned', 'draft'].includes(normalized)) return 'planned'
  if (['assigned', 'accepted', 'released', 'in_progress', 'completed', 'cancelled'].includes(normalized)) {
    return normalized
  }
  return normalized
}
