/** Pure mapping for tyre_assets (F-03 / TD-027). */

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export type TyreAssetStatus =
  | 'in_stock'
  | 'fitted'
  | 'removed'
  | 'quarantine'
  | 'disposed'
  | 'awaiting_retorque'

const STATUSES = new Set([
  'in_stock',
  'fitted',
  'removed',
  'quarantine',
  'disposed',
  'awaiting_retorque',
])

type Row = Record<string, unknown>

export function normalizeTyreStatus(value: unknown): TyreAssetStatus {
  const raw = String(value ?? '').trim().toLowerCase()
  if (STATUSES.has(raw)) return raw as TyreAssetStatus
  return 'in_stock'
}

export function mapTyreAssetRow(
  row: Row,
  opts?: { registrationNumber?: string | null; depotName?: string | null },
) {
  return {
    id: String(row.id),
    internalId: String(row.internal_id ?? ''),
    brand: String(row.brand ?? ''),
    size: String(row.size ?? ''),
    dotCode: String(row.dot_code ?? ''),
    status: normalizeTyreStatus(row.status),
    treadDepthMm: row.tread_depth_mm == null ? null : Number(row.tread_depth_mm),
    pressurePsi: row.pressure_psi == null ? null : Number(row.pressure_psi),
    vehicleId: row.vehicle_id ? String(row.vehicle_id) : null,
    registrationNumber: opts?.registrationNumber ?? null,
    position: row.position ? String(row.position) : null,
    positionLabel: row.position_label ? String(row.position_label) : null,
    depotId: row.depot_id ? String(row.depot_id) : null,
    depotName: opts?.depotName ?? null,
    fittedAt: row.fitted_at ? String(row.fitted_at) : null,
    removedAt: row.removed_at ? String(row.removed_at) : null,
    retorqueDueAt: row.retorque_due_at ? String(row.retorque_due_at) : null,
    recommendation: row.recommendation ? String(row.recommendation) : null,
    linkedDefectId: row.linked_defect_id ? String(row.linked_defect_id) : null,
    linkedInspectionId: row.linked_inspection_id ? String(row.linked_inspection_id) : null,
    unitCost: row.unit_cost == null ? null : Number(row.unit_cost),
  }
}

export function tyreNeedsAttentionMapped(
  tyre: ReturnType<typeof mapTyreAssetRow>,
  minTread: number,
): boolean {
  if (tyre.status === 'quarantine' || tyre.status === 'awaiting_retorque') return true
  if (tyre.recommendation) return true
  if (tyre.treadDepthMm != null && tyre.treadDepthMm < minTread) return true
  if (tyre.retorqueDueAt && Date.parse(tyre.retorqueDueAt) < Date.now()) return true
  return false
}
