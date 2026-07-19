import type { VehiclePmiInterval, VehicleProfile } from '@/lib/vehicles/types'

export type PmiDueStatus = 'scheduled' | 'due_soon' | 'due' | 'overdue' | 'ok'

export type PmiIntervalPolicy = VehiclePmiInterval

export const COMPANY_DEFAULT_PMI_WEEKS = 8
export const OLD_VEHICLE_MAX_PMI_WEEKS = 6
export const OLD_VEHICLE_AGE_YEARS = 12

export function defaultPmiInterval(
  profile: Pick<VehicleProfile, 'modelYear' | 'nextMaintenanceDate' | 'nextMaintenanceMileage'>,
): PmiIntervalPolicy {
  const ageYears =
    profile.modelYear != null ? new Date().getFullYear() - profile.modelYear : null
  const older = ageYears != null && ageYears >= OLD_VEHICLE_AGE_YEARS
  return {
    intervalWeeks: older ? OLD_VEHICLE_MAX_PMI_WEEKS : COMPANY_DEFAULT_PMI_WEEKS,
    reason: older
      ? `Vehicle age ${ageYears}+ years — DVSA guidance recommends a maximum six-week interval`
      : 'Company default PMI interval',
    approvedBy: 'Transport Manager',
    approvedAt: '2026-01-15T09:00:00.000Z',
    reviewDueAt: '2026-10-01',
    mileageLimit: profile.nextMaintenanceMileage,
    lastCompletedAt: null,
  }
}

/** Prefer stored vehicle policy; fall back to company / age-based default. */
export function resolvePmiInterval(
  profile: Pick<VehicleProfile, 'modelYear' | 'nextMaintenanceDate' | 'nextMaintenanceMileage' | 'pmiInterval'>,
): PmiIntervalPolicy {
  if (profile.pmiInterval) return profile.pmiInterval
  return defaultPmiInterval(profile)
}

/** Next due = earlier of calendar limit (from last PMI / nextMaintenanceDate) and mileage limit. */
export function computePmiDue(input: {
  nextMaintenanceDate: string | null
  nextMaintenanceMileage: number | null
  mileage: number | null
  interval?: PmiIntervalPolicy | null
}): { dueDate: string | null; dueMileage: number | null; trigger: 'date' | 'mileage' | 'none'; status: PmiDueStatus } {
  const dueDate = input.nextMaintenanceDate
  const dueMileage = input.interval?.mileageLimit ?? input.nextMaintenanceMileage
  const now = Date.now()

  let dateOverdue = false
  let dateDueSoon = false
  let dateDueToday = false
  if (dueDate) {
    const t = new Date(dueDate).getTime()
    const days = Math.ceil((t - now) / (24 * 60 * 60 * 1000))
    dateOverdue = t < now
    dateDueToday = days === 0
    dateDueSoon = days >= 0 && days <= 14
  }

  let mileageOverdue = false
  let mileageDueSoon = false
  if (dueMileage != null && input.mileage != null) {
    const remaining = dueMileage - input.mileage
    mileageOverdue = remaining <= 0
    mileageDueSoon = remaining > 0 && remaining <= 500
  }

  let trigger: 'date' | 'mileage' | 'none' = 'none'
  if (mileageOverdue && (!dateOverdue || (dueDate && dueMileage != null))) {
    trigger = mileageOverdue && !dateOverdue ? 'mileage' : dateOverdue ? 'date' : 'mileage'
  } else if (dateOverdue) trigger = 'date'
  else if (mileageOverdue) trigger = 'mileage'
  else if (dueDate && dueMileage != null && input.mileage != null) {
    trigger = dateDueSoon ? 'date' : mileageDueSoon ? 'mileage' : dueDate ? 'date' : 'none'
  } else if (dueDate) trigger = 'date'
  else if (dueMileage != null) trigger = 'mileage'

  if (dateOverdue || mileageOverdue) {
    return { dueDate, dueMileage, trigger: trigger === 'none' ? 'date' : trigger, status: 'overdue' }
  }
  if (dateDueToday) {
    return { dueDate, dueMileage, trigger: 'date', status: 'due' }
  }
  if (dateDueSoon || mileageDueSoon) {
    return { dueDate, dueMileage, trigger, status: 'due_soon' }
  }
  if (dueDate || dueMileage != null) {
    return { dueDate, dueMileage, trigger, status: 'scheduled' }
  }
  return { dueDate: null, dueMileage: null, trigger: 'none', status: 'ok' }
}

export function pmiStatusLabel(status: PmiDueStatus): string {
  switch (status) {
    case 'overdue':
      return 'Overdue'
    case 'due':
      return 'Due'
    case 'due_soon':
      return 'Due soon'
    case 'scheduled':
      return 'Scheduled'
    default:
      return 'No PMI due'
  }
}
