import type { AdBlueRecord, RecordAdBlueInput } from './types'

let seq = 3

const records: AdBlueRecord[] = [
  {
    id: 'adblue-1',
    vehicleId: 'veh-1',
    registrationNumber: 'AB12 CDE',
    depotId: 'depot-1',
    depotName: 'Streatham',
    occurredAt: '2026-07-18T07:15:00.000Z',
    recordedAt: '2026-07-18T07:16:00.000Z',
    recordedByUserId: null,
    recordedByName: 'J. Miller',
    recordedByRole: 'Yard operative',
    physicallyAddedBy: 'self',
    physicallyAddedByName: null,
    mileage: 48210,
    mileageUnit: 'miles',
    amountLitres: 12.5,
    fillType: 'partial',
    sourceType: 'depot_dispenser',
    sourceLabel: 'Pump D-02',
    cost: null,
    receiptReference: null,
    warningBefore: 'low',
    warningCleared: 'yes',
    notes: null,
    linkedDutyId: null,
    linkedDefectId: null,
    createDefectSuggested: false,
    status: 'recorded',
  },
  {
    id: 'adblue-2',
    vehicleId: 'veh-1',
    registrationNumber: 'AB12 CDE',
    depotId: 'depot-1',
    depotName: 'Streatham',
    occurredAt: '2026-07-10T18:40:00.000Z',
    recordedAt: '2026-07-10T18:42:00.000Z',
    recordedByUserId: null,
    recordedByName: 'Sam Driver',
    recordedByRole: 'Driver',
    physicallyAddedBy: 'self',
    physicallyAddedByName: null,
    mileage: 47980,
    mileageUnit: 'miles',
    amountLitres: 10,
    fillType: 'full',
    sourceType: 'retail_station',
    sourceLabel: 'Shell Brixton',
    cost: 18.5,
    receiptReference: 'RCP-4412',
    warningBefore: 'none',
    warningCleared: 'not_checked',
    notes: 'Purchased during duty',
    linkedDutyId: null,
    linkedDefectId: null,
    createDefectSuggested: false,
    status: 'recorded',
  },
]

function createDefectSuggested(input: RecordAdBlueInput) {
  return (
    input.warningCleared === 'no' ||
    input.warningBefore === 'no_restart' ||
    input.warningBefore === 'system_fault'
  )
}

export const mockAdBlueApi = {
  listForVehicle(vehicleId: string): AdBlueRecord[] {
    return records
      .filter((r) => r.vehicleId === vehicleId)
      .slice()
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  },

  listAll(): AdBlueRecord[] {
    return records.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  },

  record(vehicleId: string, registrationNumber: string, input: RecordAdBlueInput, actorName: string): AdBlueRecord {
    if (!Number.isFinite(input.amountLitres) || input.amountLitres <= 0) {
      throw new Error('Enter how many litres of AdBlue were added.')
    }
    if (!Number.isFinite(input.mileage) || input.mileage < 0) {
      throw new Error('Enter a valid mileage.')
    }
    const now = new Date().toISOString()
    const row: AdBlueRecord = {
      id: `adblue-${++seq}`,
      vehicleId,
      registrationNumber,
      depotId: null,
      depotName: null,
      occurredAt: input.occurredAt ?? now,
      recordedAt: now,
      recordedByUserId: null,
      recordedByName: actorName,
      recordedByRole: input.recordedByRole ?? 'Fleet administrator',
      physicallyAddedBy: input.physicallyAddedBy ?? 'self',
      physicallyAddedByName: input.physicallyAddedByName ?? null,
      mileage: Math.round(input.mileage),
      mileageUnit: 'miles',
      amountLitres: Math.round(input.amountLitres * 100) / 100,
      fillType: input.fillType,
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel ?? null,
      cost: input.cost ?? null,
      receiptReference: input.receiptReference ?? null,
      warningBefore: input.warningBefore,
      warningCleared: input.warningCleared,
      notes: input.notes ?? null,
      linkedDutyId: input.linkedDutyId ?? null,
      linkedDefectId: null,
      createDefectSuggested: createDefectSuggested(input),
      status: 'recorded',
    }
    records.unshift(row)
    return row
  },
}
