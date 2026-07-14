import type { VehicleProfile, VehicleRestriction } from '@/lib/vehicles/types'
import type { DefectRestrictionInfo } from './types'

export const DEFECT_RESTRICTION_OPTIONS = [
  { type: 'day_shift_only' as const, label: 'Daylight operation only' },
  { type: 'no_school' as const, label: 'No school transport' },
  { type: 'no_wheelchair' as const, label: 'No wheelchair passengers' },
  { type: 'depot_only' as const, label: 'Depot movement only' },
  { type: 'contract_only' as const, label: 'Contract work only' },
]

export function activeRestrictionsForDefect(profile: VehicleProfile, defectId: string): DefectRestrictionInfo[] {
  return profile.restrictions
    .filter((r) => r.defectId === defectId && r.status === 'active' && !isRestrictionExpired(r))
    .map(toRestrictionInfo)
}

export function activeVehicleRestrictions(profile: VehicleProfile): VehicleRestriction[] {
  return profile.restrictions.filter((r) => r.status === 'active' && !isRestrictionExpired(r))
}

export function restrictionSummary(profile: VehicleProfile): string | null {
  const active = activeVehicleRestrictions(profile)
  if (active.length === 0) return null
  return active.map((r) => r.label).join('; ')
}

function isRestrictionExpired(r: VehicleRestriction): boolean {
  if (!r.expiresAt) return false
  return new Date(r.expiresAt).getTime() < Date.now()
}

function toRestrictionInfo(r: VehicleRestriction): DefectRestrictionInfo {
  return {
    id: r.id,
    type: r.type,
    label: r.label,
    reason: r.reason,
    status: r.status,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt ?? null,
  }
}
