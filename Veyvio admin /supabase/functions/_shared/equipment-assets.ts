/**
 * Durable equipment inventory — sole Command write path for kit assets (F-18 / TD-027).
 *
 * Wave 3F UserScopedDb/RLS cutover 12: membership JWT reads/writes
 * `equipment_assets` through RLS (SELECT/INSERT/UPDATE). Support-grant
 * sessions, hub/projection lists, and Yard mutations without a membership JWT
 * stay on company-scoped service-role. Membership JWT also appends
 * `equipment_asset_events` (SELECT/INSERT). Vehicle/depot lookups stay
 * service-role. writeImmutableAudit stays privileged.
 */
import { companyScopedServiceDb, resolveTenantDb, userScopedDb } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import {
  isUuid,
  mapEquipmentAssetRow,
  mapEquipmentToVehicleItem,
  mapEquipmentToYardAssigned,
  normalizeEquipmentCategory,
  normalizeEquipmentStatus,
  buildEquipmentByVehicleMap,
  groupVehicleEquipmentItems,
  type EquipmentAssetCategory,
  type EquipmentAssetStatus,
} from './equipment-assets.mapping.ts'
import type { RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

type EquipmentScope = {
  companyId: string
  context?: RequestContext
}

function equipmentTenantDb(scope: EquipmentScope) {
  const companyId = scope.context?.companyId ?? scope.companyId
  if (scope.context?.workspaceAuthority === 'support') {
    return companyScopedServiceDb(scope.context, 'equipment_assets_support_grant')
  }
  if (scope.context) {
    return userScopedDb(scope.context, 'equipment_assets')
  }
  return resolveTenantDb(companyId, 'equipment_assets')
}

function equipmentSideEffectsDb(scope: EquipmentScope) {
  if (scope.context) {
    return companyScopedServiceDb(scope.context, 'equipment_assets_side_effects')
  }
  return resolveTenantDb(scope.companyId, 'equipment_assets_side_effects')
}

function scopeFrom(input: { context?: RequestContext; companyId: string }): EquipmentScope {
  return { companyId: input.context?.companyId ?? input.companyId, context: input.context }
}

async function appendEvent(input: {
  scope: EquipmentScope
  equipmentId: string
  eventType: string
  actorUserId?: string | null
  actorName: string
  body?: string | null
  payload?: Record<string, unknown>
}) {
  const { error } = await equipmentTenantDb(input.scope).from('equipment_asset_events').insert({
    company_id: input.scope.companyId,
    equipment_id: input.equipmentId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName,
    body: input.body ?? null,
    payload: input.payload ?? {},
  })
  if (error) throw new Error(error.message)
}

async function loadAsset(scope: EquipmentScope, equipmentId: string): Promise<Row | null> {
  const companyId = scope.companyId
  const { data, error } = await equipmentTenantDb(scope)
    .from('equipment_assets')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', equipmentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return enrichAsset(scope, data as Row)
}

async function enrichAsset(scope: EquipmentScope, row: Row): Promise<Row> {
  const companyId = scope.companyId
  const lookups = equipmentSideEffectsDb(scope)
  const [{ data: vehicle }, { data: depot }] = await Promise.all([
    row.vehicle_id
      ? lookups
          .from('vehicles')
          .select('registration')
          .eq('company_id', companyId)
          .eq('id', String(row.vehicle_id))
          .maybeSingle()
      : Promise.resolve({ data: null }),
    row.depot_id
      ? lookups
          .from('depots')
          .select('name')
          .eq('company_id', companyId)
          .eq('id', String(row.depot_id))
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  return { ...row, vehicles: vehicle, depots: depot }
}

function mapLoaded(row: Row) {
  const vehicle = (row.vehicles as Row | null) ?? null
  const depot = (row.depots as Row | null) ?? null
  return mapEquipmentAssetRow(row, {
    registrationNumber: vehicle?.registration ? String(vehicle.registration) : null,
    depotName: depot?.name ? String(depot.name) : null,
  })
}

export async function listEquipmentAssets(companyId: string, context?: RequestContext) {
  const scope = scopeFrom({ companyId, context })
  const { data, error } = await equipmentTenantDb(scope)
    .from('equipment_assets')
    .select('*')
    .eq('company_id', scope.companyId)
    .order('name', { ascending: true })
    .limit(500)
  if (error) throw new Error(error.message)
  const rows = await Promise.all((data ?? []).map((row) => enrichAsset(scope, row as Row)))
  return rows.map((row) => mapLoaded(row))
}

export async function listEquipmentRowsForCompany(companyId: string, context?: RequestContext): Promise<Row[]> {
  const scope = scopeFrom({ companyId, context })
  const { data, error } = await equipmentTenantDb(scope)
    .from('equipment_assets')
    .select('*')
    .eq('company_id', scope.companyId)
    .limit(1000)
  if (error) throw new Error(error.message)
  return (data ?? []) as Row[]
}

export async function getEquipmentAsset(companyId: string, equipmentId: string, context?: RequestContext) {
  const row = await loadAsset(scopeFrom({ companyId, context }), equipmentId)
  if (!row) return null
  return mapLoaded(row)
}

export async function createEquipmentAsset(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  name: string
  category?: string
  status?: string
  depotId?: string | null
  vehicleId?: string | null
  qrCode?: string | null
  serialNumber?: string | null
  requiredForDuty?: boolean
  expiryAt?: string | null
  inspectionDueAt?: string | null
  serviceable?: boolean
  inDate?: boolean
}) {
  const scope = scopeFrom(input)
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'name is required')

  const now = new Date().toISOString()
  const vehicleId = input.vehicleId ? String(input.vehicleId) : null
  const status: EquipmentAssetStatus = vehicleId
    ? 'assigned'
    : normalizeEquipmentStatus(input.status ?? 'available')
  const category: EquipmentAssetCategory = normalizeEquipmentCategory(input.category)

  const insert: Row = {
    company_id: scope.companyId,
    name,
    category,
    status,
    depot_id: input.depotId ? String(input.depotId) : null,
    vehicle_id: vehicleId,
    qr_code: input.qrCode ? String(input.qrCode).trim() || null : null,
    serial_number: input.serialNumber ? String(input.serialNumber).trim() || null : null,
    required_for_duty: Boolean(input.requiredForDuty),
    expiry_at: input.expiryAt ? String(input.expiryAt).slice(0, 10) : null,
    inspection_due_at: input.inspectionDueAt ? String(input.inspectionDueAt).slice(0, 10) : null,
    serviceable: input.serviceable !== false,
    in_date: input.inDate !== false,
    assigned_at: vehicleId ? now : null,
    assigned_by_user_id: vehicleId ? input.actorUserId : null,
    assigned_by_name: vehicleId ? input.actorName : null,
    created_by: input.actorUserId,
    updated_at: now,
  }

  const { data, error } = await equipmentTenantDb(scope).from('equipment_assets').insert(insert).select('id').single()
  if (error) throw new Error(error.message)
  const id = String(data.id)

  await appendEvent({
    scope,
    equipmentId: id,
    eventType: 'created',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Created ${name}`,
    payload: { vehicleId, status, category },
  })
  if (vehicleId) {
    await appendEvent({
      scope,
      equipmentId: id,
      eventType: 'assigned',
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      body: `Assigned to vehicle ${vehicleId}`,
      payload: { vehicleId },
    })
  }

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: 'equipment.created',
    entityType: 'equipment_asset',
    entityId: id,
    reason: name,
    afterSnapshot: insert,
  })

  return getEquipmentAsset(scope.companyId, id, input.context)
}

export async function assignEquipmentAsset(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  equipmentId: string
  vehicleId: string | null
  depotId?: string | null
}) {
  const scope = scopeFrom(input)
  const equipmentId = String(input.equipmentId)
  if (!equipmentId) throw new HttpError(400, 'equipmentId is required')

  const existing = await loadAsset(scope, equipmentId)
  if (!existing) throw new HttpError(404, 'Equipment asset not found')

  const previousVehicleId = existing.vehicle_id ? String(existing.vehicle_id) : null
  const nextVehicleId = input.vehicleId ? String(input.vehicleId) : null
  if (previousVehicleId === nextVehicleId) {
    return mapLoaded(existing)
  }

  if (nextVehicleId) {
    const { data: vehicle, error } = await equipmentSideEffectsDb(scope)
      .from('vehicles')
      .select('id, primary_depot_id')
      .eq('company_id', scope.companyId)
      .eq('id', nextVehicleId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!vehicle) throw new HttpError(404, 'Vehicle not found')
    if (!input.depotId && vehicle.primary_depot_id) {
      input.depotId = String(vehicle.primary_depot_id)
    }
  }

  const now = new Date().toISOString()
  const patch: Row = {
    vehicle_id: nextVehicleId,
    status: nextVehicleId ? 'assigned' : 'available',
    assigned_at: nextVehicleId ? now : null,
    assigned_by_user_id: nextVehicleId ? input.actorUserId : null,
    assigned_by_name: nextVehicleId ? input.actorName : null,
    depot_id: input.depotId ? String(input.depotId) : existing.depot_id ?? null,
    updated_at: now,
  }

  const { error: updateError } = await equipmentTenantDb(scope)
    .from('equipment_assets')
    .update(patch)
    .eq('company_id', scope.companyId)
    .eq('id', equipmentId)
  if (updateError) throw new Error(updateError.message)

  const eventType = !previousVehicleId && nextVehicleId
    ? 'assigned'
    : previousVehicleId && !nextVehicleId
      ? 'unassigned'
      : 'transferred'

  await appendEvent({
    scope,
    equipmentId,
    eventType,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: nextVehicleId
      ? `Assigned to vehicle ${nextVehicleId}`
      : `Returned to store from ${previousVehicleId ?? 'vehicle'}`,
    payload: { fromVehicleId: previousVehicleId, toVehicleId: nextVehicleId },
  })

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: `equipment.${eventType}`,
    entityType: 'equipment_asset',
    entityId: equipmentId,
    reason: nextVehicleId ?? previousVehicleId,
    beforeSnapshot: { vehicle_id: previousVehicleId, status: existing.status },
    afterSnapshot: patch,
  })

  return getEquipmentAsset(scope.companyId, equipmentId, input.context)
}

export async function updateVehicleEquipmentItem(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  vehicleId: string
  equipmentId: string
  assigned?: boolean
  serviceable?: boolean
  inDate?: boolean
  status?: string
}) {
  const scope = scopeFrom(input)
  const existing = await loadAsset(scope, input.equipmentId)
  if (!existing) throw new HttpError(404, 'Equipment asset not found')

  const currentVehicle = existing.vehicle_id ? String(existing.vehicle_id) : null
  if (input.assigned === true && currentVehicle !== input.vehicleId) {
    await assignEquipmentAsset({
      context: input.context,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      equipmentId: input.equipmentId,
      vehicleId: input.vehicleId,
    })
  } else if (input.assigned === false && currentVehicle === input.vehicleId) {
    await assignEquipmentAsset({
      context: input.context,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      equipmentId: input.equipmentId,
      vehicleId: null,
    })
  }

  const now = new Date().toISOString()
  const patch: Row = { updated_at: now }
  if (typeof input.serviceable === 'boolean') patch.serviceable = input.serviceable
  if (typeof input.inDate === 'boolean') patch.in_date = input.inDate
  if (input.status) patch.status = normalizeEquipmentStatus(input.status)
  else if (input.serviceable === false) patch.status = 'unserviceable'
  else if (input.inDate === false) patch.status = 'expired'

  if (Object.keys(patch).length > 1) {
    const { error } = await equipmentTenantDb(scope)
      .from('equipment_assets')
      .update(patch)
      .eq('company_id', scope.companyId)
      .eq('id', input.equipmentId)
    if (error) throw new Error(error.message)

    await appendEvent({
      scope,
      equipmentId: input.equipmentId,
      eventType: 'updated',
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      body: 'Updated equipment condition',
      payload: patch,
    })
  }

  return getEquipmentAsset(scope.companyId, input.equipmentId, input.context)
}

/** Resolve Yard client itemId (uuid or qr/local code) within company. */
export async function findEquipmentByClientId(
  companyId: string,
  itemId: string,
  context?: RequestContext,
): Promise<Row | null> {
  if (!itemId) return null
  const scope = scopeFrom({ companyId, context })
  if (isUuid(itemId)) {
    return loadAsset(scope, itemId)
  }
  const { data, error } = await equipmentTenantDb(scope)
    .from('equipment_assets')
    .select('*')
    .eq('company_id', scope.companyId)
    .eq('qr_code', itemId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return enrichAsset(scope, data as Row)
}

/**
 * Yard outbox: create-or-assign / transfer / unassign durable inventory rows.
 * Returns the authoritative equipment id.
 */
export async function applyYardEquipmentMutation(input: {
  type: string
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  payload: Row
}): Promise<{ equipmentId: string }> {
  const itemId = String(input.payload.itemId ?? input.payload.equipmentId ?? '')
  const label = String(input.payload.label ?? input.payload.name ?? '').trim() || 'Equipment'
  const vehicleId = String(input.payload.vehicleId ?? '')
  const fromVehicleId = String(input.payload.fromVehicleId ?? vehicleId)
  const toVehicleId = String(input.payload.toVehicleId ?? '')
  const reason = input.payload.reason ? String(input.payload.reason) : null
  const destination = input.payload.destination ? String(input.payload.destination) : null

  if (input.type === 'equipment.assign') {
    if (!vehicleId) throw new HttpError(400, 'vehicleId is required')
    const existing = itemId ? await findEquipmentByClientId(input.companyId, itemId, input.context) : null
    if (existing) {
      const asset = await assignEquipmentAsset({
        context: input.context,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        equipmentId: String(existing.id),
        vehicleId,
      })
      return { equipmentId: String(asset?.id ?? existing.id) }
    }
    const created = await createEquipmentAsset({
      context: input.context,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      name: label,
      category: 'equipment',
      vehicleId,
      qrCode: itemId && !isUuid(itemId) ? itemId : null,
    })
    return { equipmentId: String(created?.id) }
  }

  if (input.type === 'equipment.transfer') {
    if (reason || destination) {
      if (!itemId) throw new HttpError(400, 'itemId is required')
      const existing = await findEquipmentByClientId(input.companyId, itemId, input.context)
      if (!existing) throw new HttpError(404, 'Equipment asset not found')
      await assignEquipmentAsset({
        context: input.context,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        equipmentId: String(existing.id),
        vehicleId: null,
      })
      await appendEvent({
        scope: scopeFrom(input),
        equipmentId: String(existing.id),
        eventType: 'unassigned',
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        body: `Returned to ${destination ?? 'store'}${reason ? ` (${reason})` : ''}`,
        payload: { reason, destination, fromVehicleId: vehicleId || fromVehicleId },
      })
      return { equipmentId: String(existing.id) }
    }

    if (!toVehicleId || !itemId) {
      throw new HttpError(400, 'toVehicleId and itemId are required for transfer')
    }
    const existing = await findEquipmentByClientId(input.companyId, itemId, input.context)
    if (!existing) throw new HttpError(404, 'Equipment asset not found')
    await assignEquipmentAsset({
      context: input.context,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      equipmentId: String(existing.id),
      vehicleId: toVehicleId,
    })
    return { equipmentId: String(existing.id) }
  }

  if (input.type === 'equipment.restock') {
    throw new HttpError(400, 'Use applyYardConsumableRestock for equipment.restock')
  }

  throw new HttpError(400, `Unsupported equipment mutation ${input.type}`)
}

export { mapEquipmentAssetRow, mapEquipmentToVehicleItem, mapEquipmentToYardAssigned, buildEquipmentByVehicleMap, groupVehicleEquipmentItems }
