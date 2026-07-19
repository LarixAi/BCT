import type { AdBlueRecord } from './types'

/** Coerce live/mock payloads into a safe AdBlueRecord list. */
export function normalizeAdBlueRecords(input: unknown): AdBlueRecord[] {
  const rows = Array.isArray(input) ? input : []
  return rows.map((row, index) => normalizeAdBlueRecord(row, index)).filter(Boolean) as AdBlueRecord[]
}

export function normalizeAdBlueRecord(row: unknown, index = 0): AdBlueRecord | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const mileageRaw = r.mileage ?? r.odometerMiles ?? r.odometer
  const amountRaw = r.amountLitres ?? r.quantityLitres ?? r.quantity
  const mileage = mileageRaw != null && mileageRaw !== '' ? Number(mileageRaw) : null
  const amountLitres = amountRaw != null && amountRaw !== '' ? Number(amountRaw) : null

  return {
    id: String(r.id ?? `adblue-${index}`),
    vehicleId: String(r.vehicleId ?? ''),
    registrationNumber: String(r.registrationNumber ?? '—'),
    depotId: r.depotId != null ? String(r.depotId) : null,
    depotName: r.depotName != null ? String(r.depotName) : null,
    occurredAt: String(r.occurredAt ?? r.topUpAt ?? r.recordedAt ?? new Date().toISOString()),
    recordedAt: String(r.recordedAt ?? r.occurredAt ?? new Date().toISOString()),
    recordedByUserId: r.recordedByUserId != null ? String(r.recordedByUserId) : null,
    recordedByName: String(r.recordedByName ?? r.recordedBy ?? 'Unknown'),
    recordedByRole: String(r.recordedByRole ?? 'Staff'),
    physicallyAddedBy: (r.physicallyAddedBy as AdBlueRecord['physicallyAddedBy']) ?? 'self',
    physicallyAddedByName: r.physicallyAddedByName != null ? String(r.physicallyAddedByName) : null,
    mileage: Number.isFinite(mileage) ? (mileage as number) : 0,
    mileageUnit: r.mileageUnit === 'kilometres' ? 'kilometres' : 'miles',
    amountLitres: Number.isFinite(amountLitres) ? (amountLitres as number) : 0,
    fillType: (r.fillType as AdBlueRecord['fillType']) ?? 'partial',
    sourceType: (r.sourceType as AdBlueRecord['sourceType']) ?? 'depot_dispenser',
    sourceLabel: r.sourceLabel != null ? String(r.sourceLabel) : null,
    cost: r.cost != null && r.cost !== '' ? Number(r.cost) : null,
    receiptReference: r.receiptReference != null ? String(r.receiptReference) : null,
    warningBefore: (r.warningBefore as AdBlueRecord['warningBefore']) ?? 'none',
    warningCleared: (r.warningCleared as AdBlueRecord['warningCleared']) ?? 'not_checked',
    notes: r.notes != null ? String(r.notes) : null,
    linkedDutyId: r.linkedDutyId != null ? String(r.linkedDutyId) : null,
    linkedDefectId: r.linkedDefectId != null ? String(r.linkedDefectId) : null,
    createDefectSuggested: Boolean(r.createDefectSuggested),
    status: (r.status as AdBlueRecord['status']) ?? 'recorded',
  }
}

export function formatMileage(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toLocaleString('en-GB')} mi`
}
