/** Pure mapping for durable equipment_assets (F-03 / TD-027). */

export type EquipmentAssetCategory =
  | 'safety_equipment'
  | 'accessibility_equipment'
  | 'equipment'
  | 'cleaning'

export type EquipmentAssetStatus =
  | 'available'
  | 'assigned'
  | 'in_service'
  | 'missing'
  | 'unserviceable'
  | 'expired'

const CATEGORIES = new Set<string>([
  'safety_equipment',
  'accessibility_equipment',
  'equipment',
  'cleaning',
])

const STATUSES = new Set<string>([
  'available',
  'assigned',
  'in_service',
  'missing',
  'unserviceable',
  'expired',
])

export function normalizeEquipmentCategory(value: unknown): EquipmentAssetCategory {
  const raw = String(value ?? '').trim().toLowerCase()
  if (CATEGORIES.has(raw)) return raw as EquipmentAssetCategory
  if (raw === 'safety' || raw === 'fixed') return 'safety_equipment'
  if (raw === 'accessibility' || raw === 'wav' || raw === 'removable') return 'accessibility_equipment'
  if (raw === 'cleaning') return 'cleaning'
  return 'equipment'
}

export function normalizeEquipmentStatus(value: unknown): EquipmentAssetStatus {
  const raw = String(value ?? '').trim().toLowerCase()
  if (STATUSES.has(raw)) return raw as EquipmentAssetStatus
  if (raw === 'present' || raw === 'complete') return 'in_service'
  if (raw === 'damaged') return 'unserviceable'
  return 'available'
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

type Row = Record<string, unknown>

export function mapEquipmentAssetRow(
  row: Row,
  opts?: { registrationNumber?: string | null; depotName?: string | null },
) {
  const vehicleId = row.vehicle_id ? String(row.vehicle_id) : null
  const status = normalizeEquipmentStatus(row.status)
  const expiry = row.expiry_at ? String(row.expiry_at).slice(0, 10) : null
  return {
    id: String(row.id),
    qrCode: row.qr_code ? String(row.qr_code) : '',
    name: String(row.name ?? 'Equipment'),
    category: normalizeEquipmentCategory(row.category),
    status,
    vehicleId,
    registrationNumber: opts?.registrationNumber ?? null,
    depotId: row.depot_id ? String(row.depot_id) : null,
    depotName: opts?.depotName ?? null,
    expiryDate: expiry,
    lastCheckedAt: row.last_verified_at ? String(row.last_verified_at) : null,
    requiredForDuty: Boolean(row.required_for_duty),
    serialNumber: row.serial_number ? String(row.serial_number) : null,
    serviceable: row.serviceable !== false,
    inDate: row.in_date !== false,
    assignedAt: row.assigned_at ? String(row.assigned_at) : null,
    assignedByName: row.assigned_by_name ? String(row.assigned_by_name) : null,
    inspectionDueAt: row.inspection_due_at ? String(row.inspection_due_at).slice(0, 10) : null,
  }
}

/** Admin vehicle profile onboard panel shape. */
export function mapEquipmentToVehicleItem(row: Row) {
  const category = normalizeEquipmentCategory(row.category)
  const status = normalizeEquipmentStatus(row.status)
  const assigned = Boolean(row.vehicle_id) || status === 'assigned' || status === 'in_service'
  let conditionLabel: 'good' | 'damaged' | 'missing' | 'expired' | null = 'good'
  if (status === 'missing') conditionLabel = 'missing'
  else if (status === 'expired') conditionLabel = 'expired'
  else if (status === 'unserviceable') conditionLabel = 'damaged'
  return {
    id: String(row.id),
    name: String(row.name ?? 'Equipment'),
    category: category === 'safety_equipment' ? ('fixed' as const) : ('removable' as const),
    assigned,
    inDate: row.in_date !== false && status !== 'expired',
    serviceable: row.serviceable !== false && status !== 'unserviceable',
    expiryDate: row.expiry_at ? String(row.expiry_at).slice(0, 10) : null,
    lastCheckedAt: row.last_verified_at ? String(row.last_verified_at) : null,
    assetNumber: row.serial_number ? String(row.serial_number) : null,
    qrCode: row.qr_code ? String(row.qr_code) : null,
    conditionLabel,
  }
}

/** Yard VehicleEquipment.assigned item. */
export function mapEquipmentToYardAssigned(row: Row) {
  const status = normalizeEquipmentStatus(row.status)
  let yardStatus: 'present' | 'missing' | 'damaged' | 'expired' | 'inspection-due' = 'present'
  if (status === 'missing') yardStatus = 'missing'
  else if (status === 'expired') yardStatus = 'expired'
  else if (status === 'unserviceable') yardStatus = 'damaged'
  else if (row.inspection_due_at) {
    const due = Date.parse(String(row.inspection_due_at))
    if (Number.isFinite(due) && due <= Date.now()) yardStatus = 'inspection-due'
  }
  return {
    id: String(row.id),
    defId: normalizeEquipmentCategory(row.category),
    label: String(row.name ?? 'Equipment'),
    status: yardStatus,
    assignedAt: row.assigned_at ? String(row.assigned_at) : new Date().toISOString(),
    assignedBy: row.assigned_by_name ? String(row.assigned_by_name) : 'Command',
    qrCode: row.qr_code ? String(row.qr_code) : undefined,
  }
}

export function buildEquipmentByVehicleMap(rows: Row[]): Record<string, {
  fixed: unknown[]
  assigned: unknown[]
  consumables: unknown[]
  documents: unknown[]
}> {
  const map: Record<string, {
    fixed: unknown[]
    assigned: unknown[]
    consumables: unknown[]
    documents: unknown[]
  }> = {}

  for (const row of rows) {
    const vehicleId = row.vehicle_id ? String(row.vehicle_id) : ''
    if (!vehicleId) continue
    if (!map[vehicleId]) {
      map[vehicleId] = { fixed: [], assigned: [], consumables: [], documents: [] }
    }
    const category = normalizeEquipmentCategory(row.category)
    if (category === 'safety_equipment') {
      map[vehicleId].fixed.push({
        id: String(row.id),
        defId: category,
        label: String(row.name ?? 'Equipment'),
        status: mapEquipmentToYardAssigned(row).status,
        expiryDate: row.expiry_at ? String(row.expiry_at).slice(0, 10) : undefined,
        inspectionDueDate: row.inspection_due_at
          ? String(row.inspection_due_at).slice(0, 10)
          : undefined,
      })
    } else {
      map[vehicleId].assigned.push(mapEquipmentToYardAssigned(row))
    }
  }
  return map
}

export function groupVehicleEquipmentItems(
  rows: Row[],
): Map<string, ReturnType<typeof mapEquipmentToVehicleItem>[]> {
  const map = new Map<string, ReturnType<typeof mapEquipmentToVehicleItem>[]>()
  for (const row of rows) {
    const vehicleId = row.vehicle_id ? String(row.vehicle_id) : ''
    if (!vehicleId) continue
    const list = map.get(vehicleId) ?? []
    list.push(mapEquipmentToVehicleItem(row))
    map.set(vehicleId, list)
  }
  return map
}
