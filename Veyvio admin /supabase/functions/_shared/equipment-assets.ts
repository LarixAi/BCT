/**
 * Durable equipment inventory — sole Command write path for kit assets (F-18 / TD-027).
 */
import { companyScopedServiceDbForCompany } from './db-authority.ts'
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

type Row = Record<string, unknown>

function equipmentDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'equipment_assets')
}

async function appendEvent(input: {
  companyId: string
  equipmentId: string
  eventType: string
  actorUserId?: string | null
  actorName: string
  body?: string | null
  payload?: Record<string, unknown>
}) {
  const { error } = await equipmentDb(input.companyId).from('equipment_asset_events').insert({
    company_id: input.companyId,
    equipment_id: input.equipmentId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName,
    body: input.body ?? null,
    payload: input.payload ?? {},
  })
  if (error) throw new Error(error.message)
}

async function loadAsset(companyId: string, equipmentId: string): Promise<Row | null> {
  const { data, error } = await equipmentDb(companyId)
    .from('equipment_assets')
    .select('*, vehicles(registration), depots(name)')
    .eq('company_id', companyId)
    .eq('id', equipmentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Row | null
}

function mapLoaded(row: Row) {
  const vehicle = (row.vehicles as Row | null) ?? null
  const depot = (row.depots as Row | null) ?? null
  return mapEquipmentAssetRow(row, {
    registrationNumber: vehicle?.registration ? String(vehicle.registration) : null,
    depotName: depot?.name ? String(depot.name) : null,
  })
}

export async function listEquipmentAssets(companyId: string) {
  const { data, error } = await equipmentDb(companyId)
    .from('equipment_assets')
    .select('*, vehicles(registration), depots(name)')
    .eq('company_id', companyId)
    .order('name', { ascending: true })
    .limit(500)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapLoaded(row as Row))
}

export async function listEquipmentRowsForCompany(companyId: string): Promise<Row[]> {
  const { data, error } = await equipmentDb(companyId)
    .from('equipment_assets')
    .select('*')
    .eq('company_id', companyId)
    .limit(1000)
  if (error) throw new Error(error.message)
  return (data ?? []) as Row[]
}

export async function getEquipmentAsset(companyId: string, equipmentId: string) {
  const row = await loadAsset(companyId, equipmentId)
  if (!row) return null
  return mapLoaded(row)
}

export async function createEquipmentAsset(input: {
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
  const companyId = input.companyId
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'name is required')

  const now = new Date().toISOString()
  const vehicleId = input.vehicleId ? String(input.vehicleId) : null
  const status: EquipmentAssetStatus = vehicleId
    ? 'assigned'
    : normalizeEquipmentStatus(input.status ?? 'available')
  const category: EquipmentAssetCategory = normalizeEquipmentCategory(input.category)

  const insert: Row = {
    company_id: input.companyId,
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

  const { data, error } = await equipmentDb(companyId).from('equipment_assets').insert(insert).select('id').single()
  if (error) throw new Error(error.message)
  const id = String(data.id)

  await appendEvent({
    companyId: input.companyId,
    equipmentId: id,
    eventType: 'created',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Created ${name}`,
    payload: { vehicleId, status, category },
  })
  if (vehicleId) {
    await appendEvent({
      companyId: input.companyId,
      equipmentId: id,
      eventType: 'assigned',
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      body: `Assigned to vehicle ${vehicleId}`,
      payload: { vehicleId },
    })
  }

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'equipment.created',
    entityType: 'equipment_asset',
    entityId: id,
    reason: name,
    afterSnapshot: insert,
  })

  return getEquipmentAsset(input.companyId, id)
}

export async function assignEquipmentAsset(input: {
  companyId: string
  actorUserId: string
  actorName: string
  equipmentId: string
  vehicleId: string | null
  depotId?: string | null
}) {
  const companyId = input.companyId
  const equipmentId = String(input.equipmentId)
  if (!equipmentId) throw new HttpError(400, 'equipmentId is required')

  const existing = await loadAsset(companyId, equipmentId)
  if (!existing) throw new HttpError(404, 'Equipment asset not found')

  const previousVehicleId = existing.vehicle_id ? String(existing.vehicle_id) : null
  const nextVehicleId = input.vehicleId ? String(input.vehicleId) : null
  if (previousVehicleId === nextVehicleId) {
    return mapLoaded(existing)
  }

  if (nextVehicleId) {
    const { data: vehicle, error } = await equipmentDb(companyId)
      .from('vehicles')
      .select('id, primary_depot_id')
      .eq('company_id', input.companyId)
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

  const { error: updateError } = await equipmentDb(companyId)
    .from('equipment_assets')
    .update(patch)
    .eq('company_id', input.companyId)
    .eq('id', equipmentId)
  if (updateError) throw new Error(updateError.message)

  const eventType = !previousVehicleId && nextVehicleId
    ? 'assigned'
    : previousVehicleId && !nextVehicleId
      ? 'unassigned'
      : 'transferred'

  await appendEvent({
    companyId: input.companyId,
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
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: `equipment.${eventType}`,
    entityType: 'equipment_asset',
    entityId: equipmentId,
    reason: nextVehicleId ?? previousVehicleId,
    beforeSnapshot: { vehicle_id: previousVehicleId, status: existing.status },
    afterSnapshot: patch,
  })

  return getEquipmentAsset(input.companyId, equipmentId)
}

export async function updateVehicleEquipmentItem(input: {
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
  const companyId = input.companyId
  const existing = await loadAsset(companyId, input.equipmentId)
  if (!existing) throw new HttpError(404, 'Equipment asset not found')

  const currentVehicle = existing.vehicle_id ? String(existing.vehicle_id) : null
  if (input.assigned === true && currentVehicle !== input.vehicleId) {
    await assignEquipmentAsset({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      equipmentId: input.equipmentId,
      vehicleId: input.vehicleId,
    })
  } else if (input.assigned === false && currentVehicle === input.vehicleId) {
    await assignEquipmentAsset({
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
    const { error } = await equipmentDb(companyId)
      .from('equipment_assets')
      .update(patch)
      .eq('company_id', input.companyId)
      .eq('id', input.equipmentId)
    if (error) throw new Error(error.message)

    await appendEvent({
      companyId: input.companyId,
      equipmentId: input.equipmentId,
      eventType: 'updated',
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      body: 'Updated equipment condition',
      payload: patch,
    })
  }

  return getEquipmentAsset(input.companyId, input.equipmentId)
}

/** Resolve Yard client itemId (uuid or qr/local code) within company. */
export async function findEquipmentByClientId(
  companyId: string,
  itemId: string,
): Promise<Row | null> {
  if (!itemId) return null
  if (isUuid(itemId)) {
    return loadAsset(companyId, itemId)
  }
  const { data, error } = await equipmentDb(companyId)
    .from('equipment_assets')
    .select('*, vehicles(registration), depots(name)')
    .eq('company_id', companyId)
    .eq('qr_code', itemId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Row | null
}

/**
 * Yard outbox: create-or-assign / transfer / unassign durable inventory rows.
 * Returns the authoritative equipment id.
 */
export async function applyYardEquipmentMutation(input: {
  type: string
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
    const existing = itemId ? await findEquipmentByClientId(input.companyId, itemId) : null
    if (existing) {
      const asset = await assignEquipmentAsset({
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        equipmentId: String(existing.id),
        vehicleId,
      })
      return { equipmentId: String(asset?.id ?? existing.id) }
    }
    const created = await createEquipmentAsset({
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
    // Unassign to store: { vehicleId, itemId, reason, destination }
    if (reason || destination) {
      if (!itemId) throw new HttpError(400, 'itemId is required')
      const existing = await findEquipmentByClientId(input.companyId, itemId)
      if (!existing) throw new HttpError(404, 'Equipment asset not found')
      await assignEquipmentAsset({
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        equipmentId: String(existing.id),
        vehicleId: null,
      })
      await appendEvent({
        companyId: input.companyId,
        equipmentId: String(existing.id),
        eventType: 'unassigned',
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        body: `Returned to ${destination ?? 'store'}${reason ? ` (${reason})` : ''}`,
        payload: { reason, destination, fromVehicleId: vehicleId || fromVehicleId },
      })
      return { equipmentId: String(existing.id) }
    }

    // Vehicle-to-vehicle: { fromVehicleId, toVehicleId, itemId }
    if (!toVehicleId || !itemId) {
      throw new HttpError(400, 'toVehicleId and itemId are required for transfer')
    }
    const existing = await findEquipmentByClientId(input.companyId, itemId)
    if (!existing) throw new HttpError(404, 'Equipment asset not found')
    await assignEquipmentAsset({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      equipmentId: String(existing.id),
      vehicleId: toVehicleId,
    })
    return { equipmentId: String(existing.id) }
  }

  if (input.type === 'equipment.restock') {
    // Handled by applyYardConsumableRestock in yard-mutation-handlers.
    throw new HttpError(400, 'Use applyYardConsumableRestock for equipment.restock')
  }

  throw new HttpError(400, `Unsupported equipment mutation ${input.type}`)
}

export { mapEquipmentAssetRow, mapEquipmentToVehicleItem, mapEquipmentToYardAssigned, buildEquipmentByVehicleMap, groupVehicleEquipmentItems }
