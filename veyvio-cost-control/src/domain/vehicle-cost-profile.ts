import type {
  CostCategory,
  CostLifecycleStatus,
  CostRecord,
  CostSubcategory,
  OrganisationId,
} from './types'
import { requireOrganisationId } from './tenancy'

/**
 * Cost subcategories — Blueprint §6/§7 vehicle cost profile.
 * Top-level category stays the budget line; subcategory explains ownership / maintenance / fuel depth.
 */

export type OwnershipSubcategory = Extract<
  CostSubcategory,
  'lease' | 'finance' | 'interest' | 'insurance' | 'tax' | 'depreciation' | 'disposal' | 'purchase'
>

export type FuelSubcategory = Extract<
  CostSubcategory,
  'fuel_card' | 'cash_fuel' | 'ev_charging' | 'adblue' | 'fees'
>

export type MaintenanceSubcategory = Extract<
  CostSubcategory,
  | 'mot'
  | 'service'
  | 'repair'
  | 'inspection'
  | 'tyres'
  | 'parts'
  | 'labour'
  | 'recovery'
  | 'hire_vehicle'
>

export const OWNERSHIP_SUBCATEGORIES: OwnershipSubcategory[] = [
  'insurance',
  'lease',
  'finance',
  'interest',
  'tax',
  'purchase',
  'depreciation',
  'disposal',
]

/** Display order for vehicle cost profile (Blueprint §7). */
export const VEHICLE_PROFILE_KEYS = [
  'finance',
  'lease',
  'insurance',
  'tax',
  'fuel',
  'maintenance',
  'other_ownership',
  'total',
] as const

export type VehicleProfileKey = (typeof VEHICLE_PROFILE_KEYS)[number]

export type VehicleCostBucket = {
  key: VehicleProfileKey
  label: string
  amountMinor: number
  costCount: number
}

export type VehicleCostProfile = {
  vehicleId: string
  organisationId: OrganisationId
  buckets: VehicleCostBucket[]
  totalMinor: number
  costs: CostRecord[]
  missingOwnershipSignals: Array<'insurance' | 'lease' | 'tax'>
}

export function subcategoryLabel(sub: CostSubcategory | null | undefined): string {
  if (!sub || sub === 'general') return 'General'
  const labels: Record<string, string> = {
    lease: 'Lease',
    finance: 'Finance / HP',
    interest: 'Interest',
    insurance: 'Insurance',
    tax: 'VED / vehicle tax',
    depreciation: 'Depreciation',
    disposal: 'Disposal',
    purchase: 'Purchase',
    fuel_card: 'Fuel card',
    cash_fuel: 'Cash fuel',
    ev_charging: 'EV charging',
    adblue: 'AdBlue',
    fees: 'Fuel fees',
    mot: 'MOT',
    service: 'Service',
    repair: 'Repair',
    inspection: 'Inspection',
    tyres: 'Tyres',
    parts: 'Parts',
    labour: 'Labour',
    recovery: 'Recovery',
    hire_vehicle: 'Hire vehicle',
  }
  return labels[sub] ?? sub
}

export function parseCostSubcategory(
  category: CostCategory,
  raw: string | null | undefined,
): CostSubcategory | null {
  if (!raw?.trim()) return null
  const value = raw.trim().toLowerCase() as CostSubcategory
  if (category === 'vehicle_ownership') {
    if ((OWNERSHIP_SUBCATEGORIES as string[]).includes(value)) return value
  }
  if (category === 'fuel') {
    if (['fuel_card', 'cash_fuel', 'ev_charging', 'adblue', 'fees'].includes(value)) return value
  }
  if (category === 'maintenance') {
    if (
      [
        'mot',
        'service',
        'repair',
        'inspection',
        'tyres',
        'parts',
        'labour',
        'recovery',
        'hire_vehicle',
      ].includes(value)
    ) {
      return value
    }
  }
  if (value === 'general') return 'general'
  throw new Error(`Unknown subcategory '${raw}' for category ${category}`)
}

function profileKeyForCost(cost: CostRecord): Exclude<VehicleProfileKey, 'total'> {
  if (cost.category === 'fuel') return 'fuel'
  if (cost.category === 'maintenance') return 'maintenance'
  if (cost.category === 'vehicle_ownership') {
    const sub = cost.subcategory
    if (sub === 'insurance') return 'insurance'
    if (sub === 'tax') return 'tax'
    if (sub === 'lease') return 'lease'
    if (sub === 'finance' || sub === 'interest' || sub === 'purchase') return 'finance'
    return 'other_ownership'
  }
  return 'other_ownership'
}

const BUCKET_LABELS: Record<Exclude<VehicleProfileKey, 'total'>, string> = {
  finance: 'Finance / purchase',
  lease: 'Lease',
  insurance: 'Insurance',
  tax: 'VED / tax',
  fuel: 'Fuel',
  maintenance: 'Maintenance',
  other_ownership: 'Other ownership',
}

/**
 * Build Blueprint §7 vehicle cost profile: finance, fuel, insurance, tax, maintenance, total.
 * Includes actual + committed + forecast attributable to the vehicle (quarantine excluded).
 */
export function buildVehicleCostProfile(input: {
  organisationId: OrganisationId
  vehicleId: string
  costs: CostRecord[]
}): VehicleCostProfile {
  const orgId = requireOrganisationId(input.organisationId)
  const vehicleId = input.vehicleId.trim().toUpperCase()
  const costs = input.costs
    .filter(
      (c) =>
        c.organisationId === orgId &&
        c.validationState !== 'quarantined' &&
        c.allocations.some((a) => (a.vehicleId ?? '').toUpperCase() === vehicleId),
    )
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))

  const amounts = new Map<Exclude<VehicleProfileKey, 'total'>, { amount: number; count: number }>()
  for (const key of Object.keys(BUCKET_LABELS) as Array<Exclude<VehicleProfileKey, 'total'>>) {
    amounts.set(key, { amount: 0, count: 0 })
  }

  for (const cost of costs) {
    const key = profileKeyForCost(cost)
    const slot = amounts.get(key)!
    // Attribute only the allocation slice for this vehicle
    const allocated = cost.allocations
      .filter((a) => (a.vehicleId ?? '').toUpperCase() === vehicleId)
      .reduce((s, a) => s + a.amountMinor, 0)
    slot.amount += allocated
    slot.count += 1
  }

  const buckets: VehicleCostBucket[] = (
    Object.keys(BUCKET_LABELS) as Array<Exclude<VehicleProfileKey, 'total'>>
  ).map((key) => {
    const slot = amounts.get(key)!
    return {
      key,
      label: BUCKET_LABELS[key],
      amountMinor: slot.amount,
      costCount: slot.count,
    }
  })

  const totalMinor = buckets.reduce((s, b) => s + b.amountMinor, 0)
  buckets.push({
    key: 'total',
    label: 'Total attributable',
    amountMinor: totalMinor,
    costCount: costs.length,
  })

  const ownershipSubs = new Set(
    costs
      .filter((c) => c.category === 'vehicle_ownership' && c.subcategory)
      .map((c) => c.subcategory),
  )
  const missingOwnershipSignals: Array<'insurance' | 'lease' | 'tax'> = []
  if (!ownershipSubs.has('insurance')) missingOwnershipSignals.push('insurance')
  if (!ownershipSubs.has('lease') && !ownershipSubs.has('finance')) {
    missingOwnershipSignals.push('lease')
  }
  if (!ownershipSubs.has('tax')) missingOwnershipSignals.push('tax')

  return {
    vehicleId,
    organisationId: orgId,
    buckets,
    totalMinor,
    costs,
    missingOwnershipSignals,
  }
}

export function listVehicleIds(costs: CostRecord[], organisationId: OrganisationId): string[] {
  const orgId = requireOrganisationId(organisationId)
  const ids = new Set<string>()
  for (const c of costs) {
    if (c.organisationId !== orgId) continue
    for (const a of c.allocations) {
      if (a.vehicleId) ids.add(a.vehicleId.toUpperCase())
    }
  }
  return [...ids].sort()
}

export function sumByStatus(
  costs: CostRecord[],
  vehicleId: string,
): Record<CostLifecycleStatus, number> {
  const out: Record<CostLifecycleStatus, number> = {
    actual: 0,
    committed: 0,
    forecast: 0,
    estimated: 0,
  }
  const id = vehicleId.toUpperCase()
  for (const c of costs) {
    const allocated = c.allocations
      .filter((a) => (a.vehicleId ?? '').toUpperCase() === id)
      .reduce((s, a) => s + a.amountMinor, 0)
    if (!allocated) continue
    out[c.status] += allocated
  }
  return out
}
