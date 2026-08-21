/** Pure mapping for depot stock + fuel cards (F-03 / TD-027). */

export type DepotStockStatus = 'normal' | 'low' | 'reorder' | 'out'
export type FuelCardStatus =
  | 'unassigned'
  | 'active'
  | 'suspended'
  | 'blocked'
  | 'lost'
  | 'expired'

const STOCK_CATEGORIES = new Set([
  'fuel',
  'adblue',
  'electricity',
  'tyre',
  'fluid',
  'part',
  'consumable',
  'equipment',
  'cleaning',
  'safety_equipment',
  'accessibility_equipment',
  'card',
])

const CARD_STATUSES = new Set([
  'unassigned',
  'active',
  'suspended',
  'blocked',
  'lost',
  'expired',
])

type Row = Record<string, unknown>

export function normalizeStockCategory(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase()
  if (STOCK_CATEGORIES.has(raw)) return raw
  return 'consumable'
}

export function normalizeFuelCardStatus(value: unknown): FuelCardStatus {
  const raw = String(value ?? '').trim().toLowerCase()
  if (CARD_STATUSES.has(raw)) return raw as FuelCardStatus
  return 'unassigned'
}

export function stockStatusFromLevels(available: number, minimum: number): DepotStockStatus {
  if (available <= 0) return 'out'
  if (minimum > 0 && available <= minimum * 0.5) return 'reorder'
  if (minimum > 0 && available <= minimum) return 'low'
  return 'normal'
}

export function mapDepotStockRow(row: Row, depotName?: string | null) {
  const available = Number(row.available ?? 0)
  const reserved = Number(row.reserved ?? 0)
  const minimum = Number(row.minimum ?? 0)
  return {
    id: String(row.id),
    depotId: String(row.depot_id),
    depotName: depotName ?? null,
    resourceItemId: String(row.resource_item_id ?? ''),
    resourceName: String(row.resource_name ?? 'Stock'),
    category: normalizeStockCategory(row.category),
    available,
    reserved,
    minimum,
    unit: String(row.unit ?? 'units'),
    status: stockStatusFromLevels(available, minimum),
  }
}

export function mapFuelCardRow(
  row: Row,
  opts?: { registrationNumber?: string | null },
) {
  return {
    id: String(row.id),
    provider: String(row.provider ?? ''),
    maskedNumber: String(row.masked_number ?? ''),
    status: normalizeFuelCardStatus(row.status),
    assignmentModel: (['vehicle', 'driver', 'depot'].includes(String(row.assignment_model))
      ? String(row.assignment_model)
      : 'vehicle') as 'vehicle' | 'driver' | 'depot',
    assignedVehicleId: row.assigned_vehicle_id ? String(row.assigned_vehicle_id) : null,
    assignedRegistration: opts?.registrationNumber ?? null,
    assignedDriverName: row.assigned_driver_name ? String(row.assigned_driver_name) : null,
    dailyLimit: row.daily_limit == null ? null : Number(row.daily_limit),
    lastTransactionAt: row.last_transaction_at ? String(row.last_transaction_at) : null,
  }
}

export function mapStockTransferRow(
  row: Row,
  opts?: { fromDepotName?: string | null; toDepotName?: string | null },
) {
  return {
    id: String(row.id),
    resourceItemId: String(row.resource_item_id ?? ''),
    resourceName: String(row.resource_name ?? 'Stock'),
    quantity: Number(row.quantity ?? 0),
    unit: String(row.unit ?? 'units'),
    fromDepotId: String(row.from_depot_id),
    fromDepotName: opts?.fromDepotName ?? '',
    toDepotId: String(row.to_depot_id),
    toDepotName: opts?.toDepotName ?? '',
    status: String(row.status ?? 'pending') as 'pending' | 'in_transit' | 'received' | 'cancelled',
    requestedBy: String(row.requested_by ?? ''),
    createdAt: String(row.created_at ?? ''),
  }
}

/** Yard depot stock line shape. */
export function mapDepotStockToYardLine(row: Row) {
  return {
    defId: String(row.resource_item_id ?? ''),
    label: String(row.resource_name ?? 'Stock'),
    onHand: Number(row.available ?? 0),
    unit: String(row.unit ?? 'units'),
  }
}

export function mapConsumableLevelToYard(row: Row) {
  return {
    defId: String(row.def_id ?? ''),
    label: String(row.label ?? 'Consumable'),
    current: Number(row.current_qty ?? 0),
    target: Number(row.target_qty ?? 0),
    unit: String(row.unit ?? 'units'),
  }
}

export function mergeConsumablesIntoEquipmentMap(
  equipmentByVehicle: Record<string, {
    fixed: unknown[]
    assigned: unknown[]
    consumables: unknown[]
    documents: unknown[]
  }>,
  consumableRows: Row[],
) {
  const next: typeof equipmentByVehicle = { ...equipmentByVehicle }
  for (const row of consumableRows) {
    const vehicleId = String(row.vehicle_id ?? '')
    if (!vehicleId) continue
    if (!next[vehicleId]) {
      next[vehicleId] = { fixed: [], assigned: [], consumables: [], documents: [] }
    } else {
      next[vehicleId] = { ...next[vehicleId], consumables: [...next[vehicleId].consumables] }
    }
    next[vehicleId].consumables.push(mapConsumableLevelToYard(row))
  }
  return next
}
