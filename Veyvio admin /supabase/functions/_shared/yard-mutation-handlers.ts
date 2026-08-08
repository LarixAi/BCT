/**
 * Command handlers for yard outbox mutations (Blueprint TD-009 / P0-02).
 * Persists to shared tables or append-only audit_events — idempotent by client correlation id.
 */
import { recordAdBlueRefill } from './adblue-records.ts'
import { maybeCreateExceptionForDefect } from './defect-automation.ts'
import { applyYardEquipmentMutation } from './equipment-assets.ts'
import { applyYardConsumableRestock } from './depot-stock.ts'
import { apiError, json } from './http.ts'
import { admin, type RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: unknown): boolean {
  return UUID_RE.test(String(value ?? ''))
}

function mapYardDefectSeverity(raw: unknown): string {
  const value = String(raw ?? '').toLowerCase()
  if (value.includes('critical') || value.includes('safety')) return 'critical'
  if (value.includes('minor')) return 'minor'
  return 'major'
}

async function findAuditServerId(
  companyId: string,
  action: string,
  correlationId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('audit_events')
    .select('id')
    .eq('company_id', companyId)
    .eq('action', action)
    .eq('correlation_id', correlationId)
    .limit(1)
    .maybeSingle()
  return data?.id ? String(data.id) : null
}

async function writeYardAuditEvent(input: {
  context: RequestContext
  action: string
  entityType: string
  entityId: string
  correlationId: string
  actorName: string
  afterSnapshot?: Row
  reason?: string
}): Promise<string> {
  const existing = await findAuditServerId(input.context.companyId, input.action, input.correlationId)
  if (existing) return existing

  const { data, error } = await admin
    .from('audit_events')
    .insert({
      company_id: input.context.companyId,
      actor_type: 'user',
      actor_id: input.context.user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      correlation_id: input.correlationId,
      source_app: 'YARD',
      after_snapshot: input.afterSnapshot ?? null,
      reason: input.reason ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return String(data.id)
}

async function yardPlanAcknowledgeMutation(
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const planId = String(payload.planId ?? '')
  const version = String(payload.version ?? '1')
  if (!planId) return apiError(400, 'planId is required')

  const correlationId = `yard_plan_ack_${planId}_v${version}`
  const serverId = await writeYardAuditEvent({
    context,
    action: 'yard.plan.acknowledged',
    entityType: 'operational_plan',
    entityId: planId,
    correlationId,
    actorName,
    afterSnapshot: {
      planId,
      operationalDate: payload.operationalDate ?? null,
      version,
    },
  })
  return json({ ok: true, serverId })
}

async function yardDefectCreateMutation(
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const vehicleId = String(payload.vehicleId ?? '')
  const clientId = String(payload.defectId ?? '')
  if (!vehicleId || !clientId) return apiError(400, 'vehicleId and defectId are required')
  if (!isUuid(vehicleId)) return apiError(400, 'vehicleId must be a server vehicle id')

  const { data: existing } = await admin
    .from('defects')
    .select('id')
    .eq('company_id', context.companyId)
    .eq('client_generated_id', clientId)
    .maybeSingle()
  if (existing?.id) return json({ ok: true, serverId: String(existing.id) })

  const description = String(payload.notes ?? payload.description ?? 'Yard defect report').trim()
  const now = new Date().toISOString()
  const defectReference = `DEF-YRD-${Date.now().toString(36).toUpperCase()}`

  const { data, error } = await admin
    .from('defects')
    .insert({
      company_id: context.companyId,
      vehicle_id: vehicleId,
      defect_reference: defectReference,
      source_type: 'yard_app',
      source_id: clientId,
      reported_by: context.user.id,
      reported_at: now,
      category: String(payload.category ?? 'yard_reported'),
      severity: mapYardDefectSeverity(payload.severity),
      description: description || 'Yard defect report',
      status: 'reported',
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'YARD',
      client_generated_id: clientId,
    })
    .select('id')
    .single()

  if (error) {
    if (String(error.code) === '23505') {
      const { data: dup } = await admin
        .from('defects')
        .select('id')
        .eq('company_id', context.companyId)
        .eq('client_generated_id', clientId)
        .maybeSingle()
      if (dup?.id) return json({ ok: true, serverId: String(dup.id) })
    }
    return apiError(500, error.message, 'database_error')
  }

  const severity = mapYardDefectSeverity(payload.severity)
  try {
    await maybeCreateExceptionForDefect({
      companyId: context.companyId,
      actorUserId: context.user.id,
      actorName,
      defectId: String(data.id),
      vehicleId,
      severity,
      category: String(payload.category ?? 'yard_reported'),
      description: description || 'Yard defect report',
    })
  } catch (automationError) {
    console.error('yard defect exception automation failed', automationError)
  }

  return json({ ok: true, serverId: String(data.id) })
}

async function yardDefectResolveMutation(
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const clientId = String(payload.defectId ?? '')
  if (!clientId) return apiError(400, 'defectId is required')

  const { data: defect } = await admin
    .from('defects')
    .select('id, status')
    .eq('company_id', context.companyId)
    .eq('client_generated_id', clientId)
    .maybeSingle()

  if (!defect?.id && isUuid(clientId)) {
    const { data: byId } = await admin
      .from('defects')
      .select('id, status')
      .eq('company_id', context.companyId)
      .eq('id', clientId)
      .maybeSingle()
    if (byId?.id) {
      return resolveDefectRow(context, byId, payload, actorName, clientId)
    }
  }

  if (!defect?.id) return apiError(404, 'Defect not found', 'not_found')
  return resolveDefectRow(context, defect, payload, actorName, clientId)
}

async function resolveDefectRow(
  context: RequestContext,
  defect: Row,
  payload: Row,
  actorName: string,
  correlationKey: string,
): Promise<Response> {
  const defectId = String(defect.id)
  if (String(defect.status) === 'closed' || String(defect.status) === 'resolved') {
    return json({ ok: true, serverId: defectId })
  }

  const now = new Date().toISOString()
  const { error } = await admin
    .from('defects')
    .update({
      status: 'closed',
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('company_id', context.companyId)
    .eq('id', defectId)

  if (error) return apiError(500, error.message, 'database_error')

  await writeYardAuditEvent({
    context,
    action: 'yard.defect.resolved',
    entityType: 'defect',
    entityId: defectId,
    correlationId: `yard_defect_resolve_${correlationKey}`,
    actorName,
    afterSnapshot: {
      note: payload.note ?? null,
      resolvedAt: payload.resolvedAt ?? now,
      resolvedBy: payload.resolvedBy ?? actorName,
    },
  })

  return json({ ok: true, serverId: defectId })
}

async function yardHandoverCompleteMutation(
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const handoverId = String(payload.handoverId ?? '')
  if (!handoverId) return apiError(400, 'handoverId is required')

  const serverId = await writeYardAuditEvent({
    context,
    action: 'yard.handover.completed',
    entityType: 'shift_handover',
    entityId: handoverId,
    correlationId: `yard_handover_${handoverId}`,
    actorName,
    afterSnapshot: {
      summary: payload.summary ?? null,
      notes: payload.notes ?? null,
    },
  })
  return json({ ok: true, serverId })
}

async function yardEquipmentMutation(
  type: string,
  context: RequestContext,
  payload: Row,
  actorName: string,
  localOperationId: string,
): Promise<Response> {
  const vehicleId = String(payload.vehicleId ?? payload.fromVehicleId ?? payload.toVehicleId ?? '')
  if (!vehicleId && type !== 'equipment.restock') {
    return apiError(400, 'vehicleId is required')
  }

  const correlationId = localOperationId || `yard_${type}_${vehicleId}_${payload.itemId ?? payload.defId ?? Date.now()}`
  try {
    if (type === 'equipment.restock') {
      const result = await applyYardConsumableRestock({
        companyId: context.companyId,
        actorUserId: context.user.id,
        actorName,
        vehicleId: String(payload.vehicleId ?? ''),
        defId: String(payload.defId ?? payload.itemId ?? ''),
        addQty: Number(payload.addQty ?? payload.quantity ?? 0),
        label: payload.label ? String(payload.label) : undefined,
        unit: payload.unit ? String(payload.unit) : undefined,
        depotId: payload.depotId ? String(payload.depotId) : null,
      })
      const serverId = await writeYardAuditEvent({
        context,
        action: `yard.${type}`,
        entityType: 'vehicle_equipment',
        entityId: result.stockItemId,
        correlationId,
        actorName,
        afterSnapshot: { ...payload, ...result },
      })
      return json({ ok: true, serverId, ...result })
    }

    const result = await applyYardEquipmentMutation({
      type,
      companyId: context.companyId,
      actorUserId: context.user.id,
      actorName,
      payload,
    })
    const serverId = await writeYardAuditEvent({
      context,
      action: `yard.${type}`,
      entityType: 'vehicle_equipment',
      entityId: result.equipmentId,
      correlationId,
      actorName,
      afterSnapshot: { ...payload, equipmentId: result.equipmentId },
    })
    return json({ ok: true, serverId, equipmentId: result.equipmentId })
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      const httpErr = error as Error & { status: number }
      return apiError(httpErr.status || 400, httpErr.message)
    }
    return apiError(500, error instanceof Error ? error.message : 'Equipment mutation failed')
  }
}

async function yardDepartureReleaseMutation(
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const releaseId = String(payload.releaseId ?? '')
  const vehicleId = String(payload.vehicleId ?? '')
  if (!releaseId || !vehicleId) return apiError(400, 'releaseId and vehicleId are required')

  const serverId = await writeYardAuditEvent({
    context,
    action: 'yard.departure.released',
    entityType: 'departure_release',
    entityId: releaseId,
    correlationId: `yard_departure_release_${releaseId}`,
    actorName,
    afterSnapshot: payload,
  })
  return json({ ok: true, serverId })
}

async function yardDepartureCompleteMutation(
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const movementId = String(payload.movementId ?? '')
  const vehicleId = String(payload.vehicleId ?? '')
  if (!movementId || !vehicleId) return apiError(400, 'movementId and vehicleId are required')

  const correlationId = `yard_departure_complete_${movementId}`
  const existing = await findAuditServerId(context.companyId, 'yard.departure.completed', correlationId)
  if (existing) return json({ ok: true, serverId: existing })

  if (isUuid(vehicleId)) {
    const now = new Date().toISOString()
    const { data: vehicle } = await admin
      .from('vehicles')
      .select('id, registration, primary_depot_id')
      .eq('company_id', context.companyId)
      .eq('id', vehicleId)
      .maybeSingle()

    if (vehicle) {
      await admin.from('yard_movements').insert({
        company_id: context.companyId,
        depot_id: vehicle.primary_depot_id ?? null,
        vehicle_id: vehicleId,
        registration_number: vehicle.registration ?? '—',
        from_location: payload.fromBayId ? String(payload.fromBayId) : 'Yard bay',
        to_location: 'In service',
        reason: 'Departure for service',
        status: 'completed',
        requested_by: actorName,
        completed_by: actorName,
        started_at: payload.departedAt ? String(payload.departedAt) : now,
        completed_at: payload.departedAt ? String(payload.departedAt) : now,
        note: payload.source ? String(payload.source) : null,
        source_app: 'yard',
        created_at: now,
      }).catch(() => undefined)

      await admin
        .from('vehicles')
        .update({ operational_status: 'in_service', updated_at: now })
        .eq('company_id', context.companyId)
        .eq('id', vehicleId)
    }
  }

  const serverId = await writeYardAuditEvent({
    context,
    action: 'yard.departure.completed',
    entityType: 'departure',
    entityId: movementId,
    correlationId,
    actorName,
    afterSnapshot: payload,
  })
  return json({ ok: true, serverId })
}

async function yardReleaseVorMutation(
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const vehicleId = String(payload.vehicleId ?? '')
  if (!vehicleId || !isUuid(vehicleId)) return apiError(400, 'vehicleId is required')

  const correlationId = `yard_release_vor_${payload.caseId ?? vehicleId}`
  const existing = await findAuditServerId(context.companyId, 'yard.vehicle.release_vor', correlationId)
  if (existing) return json({ ok: true, serverId: existing })

  const now = new Date().toISOString()
  const note = payload.note ? String(payload.note) : null

  await admin
    .from('vehicles')
    .update({ operational_status: 'available', updated_at: now })
    .eq('company_id', context.companyId)
    .eq('id', vehicleId)

  const caseId = payload.caseId ? String(payload.caseId) : ''
  if (caseId && isUuid(caseId)) {
    await admin
      .from('vor_cases')
      .update({
        status: 'released',
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('company_id', context.companyId)
      .eq('id', caseId)
  } else {
    await admin
      .from('vor_cases')
      .update({
        status: 'released',
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('company_id', context.companyId)
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
  }

  const serverId = await writeYardAuditEvent({
    context,
    action: 'yard.vehicle.release_vor',
    entityType: 'vehicle',
    entityId: vehicleId,
    correlationId,
    actorName,
    afterSnapshot: { caseId: caseId || null, note },
  })
  return json({ ok: true, serverId })
}

async function yardAdBlueRefillMutation(
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const vehicleId = String(payload.vehicleId ?? '')
  const clientId = String(payload.id ?? '')
  if (!vehicleId || !isUuid(vehicleId)) return apiError(400, 'vehicleId is required')

  if (clientId) {
    const existingAudit = await findAuditServerId(
      context.companyId,
      'yard.vehicle.adblue_refill',
      `yard_adblue_${clientId}`,
    )
    if (existingAudit) return json({ ok: true, serverId: existingAudit })
  }

  const { data: vehicle } = await admin
    .from('vehicles')
    .select('id, registration, primary_depot_id, fuel_type')
    .eq('company_id', context.companyId)
    .eq('id', vehicleId)
    .maybeSingle()
  if (!vehicle) return apiError(404, 'Vehicle not found')

  const record = await recordAdBlueRefill({
    companyId: context.companyId,
    depotId: vehicle.primary_depot_id ? String(vehicle.primary_depot_id) : null,
    vehicleId,
    registration: String(vehicle.registration ?? ''),
    driverId: context.user.id,
    driverName: actorName,
    userId: context.user.id,
    payload: {
      occurredAt: payload.occurredAt ? String(payload.occurredAt) : payload.recordedAt ? String(payload.recordedAt) : undefined,
      mileage: Number(payload.odometerMiles ?? payload.mileage ?? 0),
      amountLitres: Number(payload.quantityLitres ?? payload.amountLitres ?? 0),
      fillType: payload.fillType ? String(payload.fillType) : undefined,
      sourceType: payload.sourceType ? String(payload.sourceType) : undefined,
      sourceLabel: payload.sourceLabel ? String(payload.sourceLabel) : null,
      warningBefore: payload.warningState ? String(payload.warningState) : undefined,
      warningCleared: payload.warningCleared ? String(payload.warningCleared) : undefined,
      physicallyAddedBy: payload.physicallyAddedBy ? String(payload.physicallyAddedBy) : 'self',
      physicallyAddedByName: payload.physicallyAddedByName ? String(payload.physicallyAddedByName) : actorName,
      spillOrContamination: Boolean(payload.spillOrContamination),
      notes: payload.note ? String(payload.note) : null,
    },
  })

  if (clientId) {
    await writeYardAuditEvent({
      context,
      action: 'yard.vehicle.adblue_refill',
      entityType: 'adblue_record',
      entityId: record.id,
      correlationId: `yard_adblue_${clientId}`,
      actorName,
      afterSnapshot: { clientId, vehicleId },
    })
  }

  return json({ ok: true, serverId: record.id })
}

async function yardRepairLifecycleMutation(
  action: string,
  context: RequestContext,
  payload: Row,
  actorName: string,
): Promise<Response> {
  const orderId = String(payload.orderId ?? '')
  if (!orderId) return apiError(400, 'orderId is required')

  const serverId = await writeYardAuditEvent({
    context,
    action: `yard.repair.${action}`,
    entityType: 'repair_work_order',
    entityId: orderId,
    correlationId: `yard_repair_${action}_${orderId}`,
    actorName,
    afterSnapshot: payload,
  })
  return json({ ok: true, serverId })
}

/** Returns a Response when handled, or null to fall through to body-condition / 501. */
export async function applyPendingYardMutation(
  type: string,
  context: RequestContext,
  payload: Row,
  actorName: string,
  localOperationId = '',
): Promise<Response | null> {
  switch (type) {
    case 'plan.acknowledge':
      return yardPlanAcknowledgeMutation(context, payload, actorName)
    case 'defect.create':
      return yardDefectCreateMutation(context, payload, actorName)
    case 'defect.resolve':
      return yardDefectResolveMutation(context, payload, actorName)
    case 'handover.complete':
      return yardHandoverCompleteMutation(context, payload, actorName)
    case 'equipment.assign':
    case 'equipment.transfer':
    case 'equipment.restock':
      return yardEquipmentMutation(type, context, payload, actorName, localOperationId)
    case 'departure.release':
      return yardDepartureReleaseMutation(context, payload, actorName)
    case 'departure.complete':
      return yardDepartureCompleteMutation(context, payload, actorName)
    case 'vehicle.release_vor':
      return yardReleaseVorMutation(context, payload, actorName)
    case 'vehicle.adblue_refill':
      return yardAdBlueRefillMutation(context, payload, actorName)
    case 'repair.start':
      return yardRepairLifecycleMutation('started', context, payload, actorName)
    case 'repair.complete':
      return yardRepairLifecycleMutation('completed', context, payload, actorName)
    case 'repair.verify':
      return yardRepairLifecycleMutation('verified', context, payload, actorName)
    default:
      return null
  }
}
