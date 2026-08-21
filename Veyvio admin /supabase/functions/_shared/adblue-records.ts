/**
 * AdBlue refill validation and persistence for Driver / Yard / Command.
 *
 * Wave 3F UserScopedDb/RLS cutover 4: membership JWT writes `adblue_records`
 * through RLS (INSERT + SELECT). Support-grant sessions stay on company-scoped service-role.
 */
import { companyScopedServiceDb, userScopedDb } from './db-authority.ts'
import type { RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

export type AdBlueRefillInput = {
  occurredAt?: string
  mileage: number
  amountLitres: number
  fillType?: string
  sourceType?: string
  sourceLabel?: string | null
  warningBefore?: string
  warningCleared?: string
  physicallyAddedBy?: string
  physicallyAddedByName?: string | null
  spillOrContamination?: boolean
  notes?: string | null
  linkedDutyId?: string | null
  receiptReference?: string | null
}

function normalizeWarningBefore(value: unknown): string {
  const key = String(value ?? 'none').replace(/-/g, '_').toLowerCase()
  if (['none', 'low', 'no_restart', 'system_fault', 'unknown'].includes(key)) return key
  return 'unknown'
}

function normalizeWarningCleared(value: unknown): string {
  const key = String(value ?? 'not_checked').replace(/-/g, '_').toLowerCase()
  if (['yes', 'no', 'not_checked', 'requires_drive'].includes(key)) return key
  return 'not_checked'
}

function normalizeFillType(value: unknown): string {
  const key = String(value ?? 'partial').toLowerCase()
  if (['full', 'partial', 'emergency'].includes(key)) return key
  return 'partial'
}

function normalizeSourceType(value: unknown): string {
  const key = String(value ?? 'depot_dispenser').replace(/-/g, '_').toLowerCase()
  if (['depot_dispenser', 'retail_station', 'container', 'mobile_service', 'workshop', 'other'].includes(key)) {
    return key
  }
  return 'other'
}

function normalizePhysicallyAddedBy(value: unknown): string {
  const key = String(value ?? 'self').replace(/-/g, '_').toLowerCase()
  if (['self', 'other_staff', 'external'].includes(key)) return key
  return 'self'
}

export function shouldSuggestAdBlueDefect(input: {
  warningBefore?: string
  warningCleared?: string
  spillOrContamination?: boolean
}): boolean {
  const warningBefore = normalizeWarningBefore(input.warningBefore)
  const warningCleared = normalizeWarningCleared(input.warningCleared)
  if (input.spillOrContamination) return true
  if (warningBefore === 'no_restart' || warningBefore === 'system_fault') return true
  if (warningCleared === 'no') return true
  return false
}

export function validateAdBlueRefillInput(input: AdBlueRefillInput): { ok: true } | { ok: false; message: string } {
  const mileage = Number(input.mileage)
  const amountLitres = Number(input.amountLitres)
  if (!Number.isFinite(amountLitres) || amountLitres <= 0) {
    return { ok: false, message: 'Enter how many litres of AdBlue were added.' }
  }
  if (!Number.isFinite(mileage) || mileage < 0) {
    return { ok: false, message: 'Enter a valid odometer reading.' }
  }
  const occurredAt = input.occurredAt ?? new Date().toISOString()
  if (Number.isNaN(Date.parse(occurredAt))) {
    return { ok: false, message: 'Enter a valid refill date and time.' }
  }
  const physicallyAddedBy = normalizePhysicallyAddedBy(input.physicallyAddedBy)
  if (physicallyAddedBy !== 'self' && !String(input.physicallyAddedByName ?? '').trim()) {
    return { ok: false, message: 'Enter who physically added the AdBlue.' }
  }
  return { ok: true }
}

function adBlueDb(context: RequestContext) {
  if (context.workspaceAuthority === 'support') {
    return companyScopedServiceDb(context, 'adblue_records_support_grant')
  }
  return userScopedDb(context, 'adblue_records')
}

export async function recordAdBlueRefill(input: {
  context: RequestContext
  depotId?: string | null
  vehicleId: string
  registration: string
  driverId: string
  driverName: string
  userId: string
  payload: AdBlueRefillInput
}) {
  const validation = validateAdBlueRefillInput(input.payload)
  if (!validation.ok) throw new Error(validation.message)

  const companyId = input.context.companyId
  const db = adBlueDb(input.context)
  const occurredAt = input.payload.occurredAt ?? new Date().toISOString()
  const topUpAt = occurredAt
  const recordedAt = new Date().toISOString()
  const warningBefore = normalizeWarningBefore(input.payload.warningBefore)
  const warningCleared = normalizeWarningCleared(input.payload.warningCleared)
  const createDefectSuggested = shouldSuggestAdBlueDefect({
    warningBefore,
    warningCleared,
    spillOrContamination: Boolean(input.payload.spillOrContamination),
  })

  const { data, error } = await db
    .from('adblue_records')
    .insert({
      company_id: companyId,
      depot_id: input.depotId ?? null,
      vehicle_id: input.vehicleId,
      vehicle_registration: input.registration,
      recorded_by_user_id: input.userId,
      recorded_by_name: input.driverName,
      recorded_by_role: 'driver',
      physically_added_by: normalizePhysicallyAddedBy(input.payload.physicallyAddedBy),
      physically_added_by_name: input.payload.physicallyAddedByName?.trim() || null,
      recorded_at: recordedAt,
      top_up_at: topUpAt,
      mileage: Number(input.payload.mileage),
      mileage_unit: 'miles',
      amount_litres: Number(input.payload.amountLitres),
      fill_type: normalizeFillType(input.payload.fillType),
      source_type: normalizeSourceType(input.payload.sourceType),
      source_label: input.payload.sourceLabel?.trim() || null,
      receipt_reference: input.payload.receiptReference?.trim() || null,
      warning_before: warningBefore,
      warning_cleared: warningCleared,
      notes: input.payload.notes?.trim() || null,
      linked_duty_id: input.payload.linkedDutyId ?? null,
      status: 'recorded',
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select('id, amount_litres, mileage, top_up_at, recorded_at')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'AdBlue record could not be saved')

  return {
    id: String(data.id),
    amountLitres: Number(data.amount_litres),
    mileage: Number(data.mileage),
    occurredAt: String(data.top_up_at ?? data.recorded_at),
    createDefectSuggested,
  }
}

export async function listAdBlueRecordsForVehicle(
  context: RequestContext,
  vehicleId: string,
  limit = 10,
) {
  const companyId = context.companyId
  const db = adBlueDb(context)
  const { data, error } = await db
    .from('adblue_records')
    .select(
      'id, amount_litres, mileage, top_up_at, recorded_at, recorded_by_name, warning_before, warning_cleared, fill_type, source_type, source_label',
    )
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .order('top_up_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Row) => ({
    id: String(row.id),
    amountLitres: Number(row.amount_litres),
    mileage: Number(row.mileage),
    occurredAt: String(row.top_up_at ?? row.recorded_at),
    recordedByName: row.recorded_by_name ? String(row.recorded_by_name) : null,
    warningBefore: String(row.warning_before ?? 'none'),
    warningCleared: String(row.warning_cleared ?? 'not_checked'),
    fillType: String(row.fill_type ?? 'partial'),
    sourceType: String(row.source_type ?? 'other'),
    sourceLabel: row.source_label ? String(row.source_label) : null,
  }))
}
