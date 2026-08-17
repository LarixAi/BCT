/**
 * Durable depot stock + fuel cards — F-18 / TD-027 write path.
 */
import { companyScopedServiceDbForCompany } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import {
  mapDepotStockRow,
  mapDepotStockToYardLine,
  mapFuelCardRow,
  mapStockTransferRow,
  normalizeFuelCardStatus,
  normalizeStockCategory,
} from './depot-stock.mapping.ts'

type Row = Record<string, unknown>

function stockDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'depot_stock')
}

async function depotNameMap(companyId: string): Promise<Map<string, string>> {
  const { data, error } = await stockDb(companyId).from('depots').select('id, name').eq('company_id', companyId)
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((d) => [String(d.id), String(d.name ?? 'Depot')]))
}

export async function listDepotStock(companyId: string, depotId?: string | null) {
  let query = stockDb(companyId)
    .from('depot_stock_items')
    .select('*')
    .eq('company_id', companyId)
    .order('resource_name', { ascending: true })
    .limit(500)
  if (depotId) query = query.eq('depot_id', depotId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  const names = await depotNameMap(companyId)
  return (data ?? []).map((row) =>
    mapDepotStockRow(row as Row, names.get(String((row as Row).depot_id)) ?? null),
  )
}

export async function listFuelCards(companyId: string) {
  const { data, error } = await stockDb(companyId)
    .from('fuel_cards')
    .select('*, vehicles(registration)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const vehicle = ((row as Row).vehicles as Row | null) ?? null
    return mapFuelCardRow(row as Row, {
      registrationNumber: vehicle?.registration ? String(vehicle.registration) : null,
    })
  })
}

export async function listStockTransfers(companyId: string) {
  const { data, error } = await stockDb(companyId)
    .from('stock_transfers')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  const names = await depotNameMap(companyId)
  return (data ?? []).map((row) =>
    mapStockTransferRow(row as Row, {
      fromDepotName: names.get(String((row as Row).from_depot_id)) ?? '',
      toDepotName: names.get(String((row as Row).to_depot_id)) ?? '',
    }),
  )
}

async function getOrCreateStockItem(input: {
  companyId: string
  depotId: string
  resourceItemId: string
  resourceName: string
  category?: string
  unit?: string
  minimum?: number
  actorUserId?: string | null
}): Promise<Row> {
  const companyId = input.companyId
  const { data: existing, error } = await stockDb(companyId)
    .from('depot_stock_items')
    .select('*')
    .eq('company_id', input.companyId)
    .eq('depot_id', input.depotId)
    .eq('resource_item_id', input.resourceItemId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (existing) return existing as Row

  const insert = {
    company_id: input.companyId,
    depot_id: input.depotId,
    resource_item_id: input.resourceItemId,
    resource_name: input.resourceName,
    category: normalizeStockCategory(input.category),
    available: 0,
    reserved: 0,
    minimum: Number(input.minimum ?? 0),
    unit: input.unit ?? 'units',
    created_by: input.actorUserId ?? null,
  }
  const { data, error: insertError } = await stockDb(companyId)
    .from('depot_stock_items')
    .insert(insert)
    .select('*')
    .single()
  if (insertError) throw new Error(insertError.message)
  return data as Row
}

async function recordMovement(input: {
  companyId: string
  stockItemId: string
  movementType: string
  quantity: number
  vehicleId?: string | null
  actorUserId?: string | null
  actorName: string
  body?: string
  payload?: Record<string, unknown>
}) {
  const companyId = input.companyId
  const { error } = await stockDb(companyId).from('depot_stock_movements').insert({
    company_id: input.companyId,
    stock_item_id: input.stockItemId,
    movement_type: input.movementType,
    quantity: input.quantity,
    vehicle_id: input.vehicleId ?? null,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName,
    body: input.body ?? null,
    payload: input.payload ?? {},
  })
  if (error) throw new Error(error.message)
}

export async function upsertDepotStock(input: {
  companyId: string
  actorUserId: string
  actorName: string
  depotId: string
  resourceItemId: string
  resourceName: string
  category?: string
  unit?: string
  available?: number
  minimum?: number
  adjustBy?: number
}) {
  const depotId = String(input.depotId)
  const resourceItemId = String(input.resourceItemId).trim()
  const resourceName = String(input.resourceName).trim()
  if (!depotId || !resourceItemId || !resourceName) {
    throw new HttpError(400, 'depotId, resourceItemId and resourceName are required')
  }

  const companyId = input.companyId
  const { data: depot } = await stockDb(companyId)
    .from('depots')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('id', depotId)
    .maybeSingle()
  if (!depot) throw new HttpError(404, 'Depot not found')

  const item = await getOrCreateStockItem({
    companyId: input.companyId,
    depotId,
    resourceItemId,
    resourceName,
    category: input.category,
    unit: input.unit,
    minimum: input.minimum,
    actorUserId: input.actorUserId,
  })

  const previous = Number(item.available ?? 0)
  let next = previous
  let movementType = 'adjust'
  let quantityDelta = 0

  if (typeof input.adjustBy === 'number' && Number.isFinite(input.adjustBy)) {
    quantityDelta = input.adjustBy
    next = Math.max(0, previous + input.adjustBy)
    movementType = input.adjustBy >= 0 ? 'receive' : 'issue'
  } else if (typeof input.available === 'number' && Number.isFinite(input.available)) {
    next = Math.max(0, input.available)
    quantityDelta = next - previous
    movementType = 'adjust'
  }

  const patch: Row = {
    resource_name: resourceName,
    updated_at: new Date().toISOString(),
  }
  if (input.category) patch.category = normalizeStockCategory(input.category)
  if (input.unit) patch.unit = String(input.unit)
  if (typeof input.minimum === 'number') patch.minimum = Math.max(0, input.minimum)
  if (quantityDelta !== 0 || typeof input.available === 'number') patch.available = next

  const { error } = await stockDb(companyId)
    .from('depot_stock_items')
    .update(patch)
    .eq('company_id', input.companyId)
    .eq('id', item.id)
  if (error) throw new Error(error.message)

  if (quantityDelta !== 0) {
    await recordMovement({
      companyId: input.companyId,
      stockItemId: String(item.id),
      movementType,
      quantity: quantityDelta,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      body: `Stock ${movementType} ${resourceName}`,
      payload: { previous, next },
    })
  }

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'depot_stock.upsert',
    entityType: 'depot_stock_item',
    entityId: String(item.id),
    reason: resourceName,
    beforeSnapshot: { available: previous },
    afterSnapshot: { available: next, ...patch },
  })

  const names = await depotNameMap(input.companyId)
  return mapDepotStockRow({ ...item, ...patch, available: next }, names.get(depotId) ?? null)
}

export async function createStockTransfer(input: {
  companyId: string
  actorUserId: string
  actorName: string
  resourceItemId: string
  resourceName: string
  quantity: number
  unit?: string
  fromDepotId: string
  toDepotId: string
}) {
  const qty = Number(input.quantity)
  if (!Number.isFinite(qty) || qty <= 0) throw new HttpError(400, 'quantity must be positive')
  if (!input.fromDepotId || !input.toDepotId) throw new HttpError(400, 'fromDepotId and toDepotId are required')
  if (input.fromDepotId === input.toDepotId) throw new HttpError(400, 'Depots must differ')

  const companyId = input.companyId
  const fromItem = await getOrCreateStockItem({
    companyId: input.companyId,
    depotId: input.fromDepotId,
    resourceItemId: input.resourceItemId,
    resourceName: input.resourceName,
    unit: input.unit,
    actorUserId: input.actorUserId,
  })
  const available = Number(fromItem.available ?? 0)
  if (available < qty) throw new HttpError(409, 'Insufficient stock at source depot')

  const toItem = await getOrCreateStockItem({
    companyId: input.companyId,
    depotId: input.toDepotId,
    resourceItemId: input.resourceItemId,
    resourceName: input.resourceName,
    unit: input.unit ?? String(fromItem.unit ?? 'units'),
    actorUserId: input.actorUserId,
  })

  const now = new Date().toISOString()
  const fromNext = available - qty
  const toNext = Number(toItem.available ?? 0) + qty

  const { error: fromErr } = await stockDb(companyId)
    .from('depot_stock_items')
    .update({ available: fromNext, updated_at: now })
    .eq('company_id', input.companyId)
    .eq('id', fromItem.id)
  if (fromErr) throw new Error(fromErr.message)

  const { error: toErr } = await stockDb(companyId)
    .from('depot_stock_items')
    .update({ available: toNext, updated_at: now })
    .eq('company_id', input.companyId)
    .eq('id', toItem.id)
  if (toErr) throw new Error(toErr.message)

  await recordMovement({
    companyId: input.companyId,
    stockItemId: String(fromItem.id),
    movementType: 'transfer_out',
    quantity: -qty,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Transfer out to depot ${input.toDepotId}`,
  })
  await recordMovement({
    companyId: input.companyId,
    stockItemId: String(toItem.id),
    movementType: 'transfer_in',
    quantity: qty,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Transfer in from depot ${input.fromDepotId}`,
  })

  const { data: transfer, error: transferError } = await stockDb(companyId)
    .from('stock_transfers')
    .insert({
      company_id: input.companyId,
      resource_item_id: input.resourceItemId,
      resource_name: input.resourceName,
      quantity: qty,
      unit: input.unit ?? String(fromItem.unit ?? 'units'),
      from_depot_id: input.fromDepotId,
      to_depot_id: input.toDepotId,
      status: 'received',
      requested_by: input.actorName,
      created_by: input.actorUserId,
      updated_at: now,
    })
    .select('*')
    .single()
  if (transferError) throw new Error(transferError.message)

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'depot_stock.transfer',
    entityType: 'stock_transfer',
    entityId: String(transfer.id),
    reason: input.resourceName,
    afterSnapshot: { quantity: qty, from: input.fromDepotId, to: input.toDepotId },
  })

  const names = await depotNameMap(input.companyId)
  return mapStockTransferRow(transfer as Row, {
    fromDepotName: names.get(input.fromDepotId) ?? '',
    toDepotName: names.get(input.toDepotId) ?? '',
  })
}

export async function createFuelCard(input: {
  companyId: string
  actorUserId: string
  actorName: string
  provider: string
  maskedNumber: string
  status?: string
  assignmentModel?: string
  assignedVehicleId?: string | null
  assignedDriverName?: string | null
  depotId?: string | null
  dailyLimit?: number | null
}) {
  const provider = String(input.provider ?? '').trim()
  const maskedNumber = String(input.maskedNumber ?? '').trim()
  if (!provider || !maskedNumber) throw new HttpError(400, 'provider and maskedNumber are required')

  const companyId = input.companyId
  const vehicleId = input.assignedVehicleId ? String(input.assignedVehicleId) : null
  const status = vehicleId
    ? 'active'
    : normalizeFuelCardStatus(input.status ?? 'unassigned')

  const insert = {
    company_id: input.companyId,
    provider,
    masked_number: maskedNumber,
    status,
    assignment_model: ['vehicle', 'driver', 'depot'].includes(String(input.assignmentModel))
      ? String(input.assignmentModel)
      : 'vehicle',
    assigned_vehicle_id: vehicleId,
    assigned_driver_name: input.assignedDriverName ? String(input.assignedDriverName) : null,
    depot_id: input.depotId ? String(input.depotId) : null,
    daily_limit: input.dailyLimit == null ? null : Number(input.dailyLimit),
    created_by: input.actorUserId,
  }

  const { data, error } = await stockDb(companyId).from('fuel_cards').insert(insert).select('id').single()
  if (error) throw new Error(error.message)
  const id = String(data.id)

  await stockDb(companyId).from('fuel_card_events').insert({
    company_id: input.companyId,
    fuel_card_id: id,
    event_type: 'created',
    actor_user_id: input.actorUserId,
    actor_name: input.actorName,
    body: `Created card ${maskedNumber}`,
    payload: insert,
  })

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'fuel_card.created',
    entityType: 'fuel_card',
    entityId: id,
    reason: maskedNumber,
    afterSnapshot: insert,
  })

  const cards = await listFuelCards(input.companyId)
  return cards.find((c) => c.id === id) ?? null
}

export async function assignFuelCard(input: {
  companyId: string
  actorUserId: string
  actorName: string
  fuelCardId: string
  assignedVehicleId?: string | null
  assignedDriverName?: string | null
  status?: string
}) {
  const companyId = input.companyId
  const { data: existing, error } = await stockDb(companyId)
    .from('fuel_cards')
    .select('*')
    .eq('company_id', input.companyId)
    .eq('id', input.fuelCardId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!existing) throw new HttpError(404, 'Fuel card not found')

  const vehicleId =
    input.assignedVehicleId === undefined
      ? existing.assigned_vehicle_id
      : input.assignedVehicleId
        ? String(input.assignedVehicleId)
        : null

  const patch: Row = {
    assigned_vehicle_id: vehicleId,
    assigned_driver_name:
      input.assignedDriverName === undefined
        ? existing.assigned_driver_name
        : input.assignedDriverName
          ? String(input.assignedDriverName)
          : null,
    status: input.status
      ? normalizeFuelCardStatus(input.status)
      : vehicleId
        ? 'active'
        : 'unassigned',
    updated_at: new Date().toISOString(),
  }

  const { error: updateError } = await stockDb(companyId)
    .from('fuel_cards')
    .update(patch)
    .eq('company_id', input.companyId)
    .eq('id', input.fuelCardId)
  if (updateError) throw new Error(updateError.message)

  await stockDb(companyId).from('fuel_card_events').insert({
    company_id: input.companyId,
    fuel_card_id: input.fuelCardId,
    event_type: vehicleId ? 'assigned' : 'unassigned',
    actor_user_id: input.actorUserId,
    actor_name: input.actorName,
    body: vehicleId ? `Assigned to vehicle ${vehicleId}` : 'Unassigned',
    payload: patch,
  })

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: vehicleId ? 'fuel_card.assigned' : 'fuel_card.unassigned',
    entityType: 'fuel_card',
    entityId: input.fuelCardId,
    afterSnapshot: patch,
  })

  const cards = await listFuelCards(input.companyId)
  return cards.find((c) => c.id === input.fuelCardId) ?? null
}

/**
 * Yard restock: decrement depot stock and raise vehicle consumable level.
 */
export async function applyYardConsumableRestock(input: {
  companyId: string
  actorUserId: string
  actorName: string
  vehicleId: string
  defId: string
  addQty: number
  label?: string
  unit?: string
  depotId?: string | null
}) {
  const addQty = Number(input.addQty)
  if (!input.vehicleId) throw new HttpError(400, 'vehicleId is required')
  if (!input.defId) throw new HttpError(400, 'defId is required')
  if (!Number.isFinite(addQty) || addQty <= 0) throw new HttpError(400, 'addQty must be positive')

  const companyId = input.companyId
  const { data: vehicle, error: vehicleError } = await stockDb(companyId)
    .from('vehicles')
    .select('id, primary_depot_id')
    .eq('company_id', input.companyId)
    .eq('id', input.vehicleId)
    .maybeSingle()
  if (vehicleError) throw new Error(vehicleError.message)
  if (!vehicle) throw new HttpError(404, 'Vehicle not found')

  const depotId = input.depotId
    ? String(input.depotId)
    : vehicle.primary_depot_id
      ? String(vehicle.primary_depot_id)
      : null
  if (!depotId) throw new HttpError(400, 'Vehicle has no depot for stock issue')

  const label = String(input.label ?? input.defId)
  const unit = String(input.unit ?? 'units')

  const stockItem = await getOrCreateStockItem({
    companyId: input.companyId,
    depotId,
    resourceItemId: input.defId,
    resourceName: label,
    category: 'consumable',
    unit,
    actorUserId: input.actorUserId,
  })

  const available = Number(stockItem.available ?? 0)
  if (available < addQty) {
    throw new HttpError(409, `Insufficient depot stock for ${label} (on hand ${available})`)
  }

  const nextAvailable = available - addQty
  const now = new Date().toISOString()
  const { error: stockError } = await stockDb(companyId)
    .from('depot_stock_items')
    .update({ available: nextAvailable, updated_at: now })
    .eq('company_id', input.companyId)
    .eq('id', stockItem.id)
  if (stockError) throw new Error(stockError.message)

  await recordMovement({
    companyId: input.companyId,
    stockItemId: String(stockItem.id),
    movementType: 'restock',
    quantity: -addQty,
    vehicleId: input.vehicleId,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Restocked vehicle ${input.vehicleId}`,
    payload: { defId: input.defId, addQty },
  })

  const { data: level } = await stockDb(companyId)
    .from('vehicle_consumable_levels')
    .select('*')
    .eq('company_id', input.companyId)
    .eq('vehicle_id', input.vehicleId)
    .eq('def_id', input.defId)
    .maybeSingle()

  const current = Number(level?.current_qty ?? 0)
  const target = Number(level?.target_qty ?? Math.max(current + addQty, addQty))
  const levelUpsert = {
    company_id: input.companyId,
    vehicle_id: input.vehicleId,
    def_id: input.defId,
    label,
    current_qty: current + addQty,
    target_qty: target,
    unit,
    updated_at: now,
  }

  const { error: levelError } = await stockDb(companyId)
    .from('vehicle_consumable_levels')
    .upsert(levelUpsert, { onConflict: 'company_id,vehicle_id,def_id' })
  if (levelError) throw new Error(levelError.message)

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'equipment.restock',
    entityType: 'vehicle_consumable',
    entityId: input.vehicleId,
    reason: label,
    afterSnapshot: { defId: input.defId, addQty, depotAvailable: nextAvailable },
  })

  return {
    stockItemId: String(stockItem.id),
    depotAvailable: nextAvailable,
    vehicleCurrent: current + addQty,
  }
}

export async function listYardDepotStockLines(companyId: string, depotId: string | null) {
  if (!depotId) return []
  const { data, error } = await stockDb(companyId)
    .from('depot_stock_items')
    .select('*')
    .eq('company_id', companyId)
    .eq('depot_id', depotId)
    .order('resource_name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapDepotStockToYardLine(row as Row))
}

export async function listVehicleConsumablesByCompany(companyId: string) {
  const { data, error } = await stockDb(companyId)
    .from('vehicle_consumable_levels')
    .select('*')
    .eq('company_id', companyId)
    .limit(2000)
  if (error) throw new Error(error.message)
  return (data ?? []) as Row[]
}

export {
  mapDepotStockRow,
  mapFuelCardRow,
  mapStockTransferRow,
  mergeConsumablesIntoEquipmentMap,
} from './depot-stock.mapping.ts'
export { stockStatusFromLevels } from './depot-stock.mapping.ts'
