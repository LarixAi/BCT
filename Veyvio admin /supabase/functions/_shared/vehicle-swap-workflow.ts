/**
 * Ops-approved vehicle swap workflow on Command.
 */
import { admin } from './supabase.ts'
import { emitDomainEvent } from './domain-events.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { notifyCompanyAdmins } from './notifications.ts'
import { guardDriverScopedWrite } from './driver-write-guards.ts'
import { recordDutyAssignmentEvent } from './duty-publication.ts'
import { mapSwapRow } from './vehicle-swap-workflow.mapping.ts'

type Row = Record<string, unknown>

export async function createVehicleSwapRequest(input: {
  companyId: string
  driverId: string
  dutyId: string
  currentVehicleId: string
  requestedVehicleId: string
  reason: string
  clientGeneratedId?: string | null
}) {
  const reason = String(input.reason ?? '').trim()
  if (!reason) throw new Error('Explain why you need a different vehicle.')

  await guardDriverScopedWrite({
    companyId: input.companyId,
    driverId: input.driverId,
    dutyId: input.dutyId,
    vehicleId: input.requestedVehicleId,
  })

  if (input.currentVehicleId === input.requestedVehicleId) {
    throw new Error('Choose a different vehicle from your assigned list.')
  }

  const clientGeneratedId = input.clientGeneratedId?.trim() || null
  if (clientGeneratedId) {
    const { data: existing } = await admin
      .from('vehicle_swap_requests')
      .select('*')
      .eq('company_id', input.companyId)
      .eq('client_generated_id', clientGeneratedId)
      .maybeSingle()
    if (existing) return mapSwapRow(existing as Row)
  }

  const { data: pending } = await admin
    .from('vehicle_swap_requests')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('duty_id', input.dutyId)
    .eq('status', 'pending')
    .maybeSingle()
  if (pending?.id) throw new Error('A vehicle swap request is already waiting for dispatch.')

  const { data, error } = await admin
    .from('vehicle_swap_requests')
    .insert({
      company_id: input.companyId,
      duty_id: input.dutyId,
      driver_id: input.driverId,
      current_vehicle_id: input.currentVehicleId,
      requested_vehicle_id: input.requestedVehicleId,
      reason,
      client_generated_id: clientGeneratedId,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Swap request could not be saved')

  await recordDutyAssignmentEvent({
    companyId: input.companyId,
    dutyId: input.dutyId,
    eventType: 'vehicle_swap.requested',
    actorDriverId: input.driverId,
    payload: {
      requestId: data.id,
      currentVehicleId: input.currentVehicleId,
      requestedVehicleId: input.requestedVehicleId,
      reason,
    },
    sourceApp: 'DRIVER',
  })

  await emitDomainEvent({
    companyId: input.companyId,
    eventType: 'vehicle_swap.requested',
    entityType: 'vehicle_swap_request',
    entityId: String(data.id),
    payload: { dutyId: input.dutyId, reason },
  }).catch(() => undefined)

  await notifyCompanyAdmins({
    companyId: input.companyId,
    type: 'vehicle_swap.requested',
    title: 'Driver requested vehicle swap',
    body: reason.slice(0, 180),
    severity: 'warning',
    actionUrl: `/dispatch?duty=${input.dutyId}`,
    sourceEntityType: 'vehicle_swap_request',
    sourceEntityId: String(data.id),
  })

  return mapSwapRow(data as Row)
}

export async function listVehicleSwapRequests(companyId: string, status?: string) {
  let query = admin
    .from('vehicle_swap_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('requested_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapSwapRow(row as Row))
}

export async function resolveVehicleSwapRequest(input: {
  companyId: string
  requestId: string
  actorUserId: string
  approve: boolean
  notes?: string | null
}) {
  const { data: row, error } = await admin
    .from('vehicle_swap_requests')
    .select('*')
    .eq('company_id', input.companyId)
    .eq('id', input.requestId)
    .maybeSingle()

  if (error || !row) throw new Error('Swap request not found')
  if (String(row.status) !== 'pending') throw new Error('This swap request is already resolved.')

  const now = new Date().toISOString()
  const nextStatus = input.approve ? 'approved' : 'rejected'

  const { data: updated, error: updateError } = await admin
    .from('vehicle_swap_requests')
    .update({
      status: nextStatus,
      resolved_at: now,
      resolved_by: input.actorUserId,
      resolution_notes: input.notes?.trim() || null,
      updated_at: now,
    })
    .eq('id', input.requestId)
    .eq('company_id', input.companyId)
    .select('*')
    .single()

  if (updateError || !updated) throw new Error(updateError?.message ?? 'Could not resolve swap request')

  if (input.approve) {
    await admin
      .from('duties')
      .update({
        vehicle_id: row.requested_vehicle_id,
        updated_at: now,
        updated_by: input.actorUserId,
      })
      .eq('id', row.duty_id)
      .eq('company_id', input.companyId)

    await recordDutyAssignmentEvent({
      companyId: input.companyId,
      dutyId: String(row.duty_id),
      eventType: 'vehicle_swap.approved',
      actorUserId: input.actorUserId,
      payload: {
        requestId: input.requestId,
        vehicleId: row.requested_vehicle_id,
        notes: input.notes ?? null,
      },
      sourceApp: 'COMMAND',
    })
  }

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: input.approve ? 'vehicle_swap.approved' : 'vehicle_swap.rejected',
    entityType: 'vehicle_swap_request',
    entityId: input.requestId,
    afterSnapshot: { status: nextStatus },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: input.companyId,
    eventType: input.approve ? 'vehicle_swap.completed' : 'vehicle_swap.rejected',
    entityType: 'vehicle_swap_request',
    entityId: input.requestId,
    actorUserId: input.actorUserId,
    payload: { dutyId: row.duty_id, vehicleId: row.requested_vehicle_id },
  }).catch(() => undefined)

  return mapSwapRow(updated as Row)
}

export async function listDriverSwapRequests(companyId: string, driverId: string) {
  const { data, error } = await admin
    .from('vehicle_swap_requests')
    .select('*')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .order('requested_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapSwapRow(row as Row))
}
