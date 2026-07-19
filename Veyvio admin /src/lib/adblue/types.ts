export type AdBlueFillType = 'full' | 'partial' | 'emergency'
export type AdBlueSourceType =
  | 'depot_dispenser'
  | 'retail_station'
  | 'container'
  | 'mobile_service'
  | 'workshop'
  | 'other'
export type AdBlueWarningBefore = 'none' | 'low' | 'no_restart' | 'system_fault' | 'unknown'
export type AdBlueWarningCleared = 'yes' | 'no' | 'not_checked' | 'requires_drive'
export type AdBluePhysicallyAddedBy = 'self' | 'other_staff' | 'external'

export interface AdBlueRecord {
  id: string
  vehicleId: string
  registrationNumber: string
  depotId: string | null
  depotName: string | null
  occurredAt: string
  recordedAt: string
  recordedByUserId: string | null
  recordedByName: string
  recordedByRole: string
  physicallyAddedBy: AdBluePhysicallyAddedBy
  physicallyAddedByName: string | null
  mileage: number
  mileageUnit: 'miles' | 'kilometres'
  amountLitres: number
  fillType: AdBlueFillType
  sourceType: AdBlueSourceType
  sourceLabel: string | null
  cost: number | null
  receiptReference: string | null
  warningBefore: AdBlueWarningBefore
  warningCleared: AdBlueWarningCleared
  notes: string | null
  linkedDutyId: string | null
  linkedDefectId: string | null
  createDefectSuggested: boolean
  status: 'recorded' | 'under_review' | 'corrected'
}

export interface RecordAdBlueInput {
  occurredAt?: string
  mileage: number
  amountLitres: number
  fillType: AdBlueFillType
  sourceType: AdBlueSourceType
  sourceLabel?: string | null
  cost?: number | null
  receiptReference?: string | null
  warningBefore: AdBlueWarningBefore
  warningCleared: AdBlueWarningCleared
  physicallyAddedBy?: AdBluePhysicallyAddedBy
  physicallyAddedByName?: string | null
  notes?: string | null
  linkedDutyId?: string | null
  recordedByRole?: string
}
