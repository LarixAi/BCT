/**
 * Operating overhead ledger — Blueprint §6 / §7 Operating costs.
 * Premises, technology, professional, administration and exceptional only.
 * Lifecycle amounts use the same equations as Home / CEC budget (§5).
 */

import { computeBudgetPosition, type BudgetPosition } from './budget-equations'
import { sumLineByStatus } from './budget-hierarchy'
import { requireOrganisationId } from './tenancy'
import type {
  ApprovalStatus,
  Budget,
  CostCategory,
  CostRecord,
  CostSubcategory,
  OrganisationId,
  ReviewItem,
  VatTreatment,
} from './types'

export const OPERATING_CATEGORIES: readonly CostCategory[] = [
  'premises',
  'technology',
  'professional',
  'administration',
  'exceptional',
] as const

export type OperatingGroupId =
  | 'premises'
  | 'technology'
  | 'insurance_professional'
  | 'office_admin'
  | 'training_staff'
  | 'recurring'
  | 'other'

export type OperatingGroup = {
  id: OperatingGroupId
  label: string
  detail: string
}

export const OPERATING_GROUPS: readonly OperatingGroup[] = [
  {
    id: 'premises',
    label: 'Premises',
    detail: 'Rent, rates, utilities and cleaning',
  },
  {
    id: 'technology',
    label: 'Technology',
    detail: 'Software, licences, equipment and telecoms',
  },
  {
    id: 'insurance_professional',
    label: 'Insurance & professional',
    detail: 'Insurance and professional fees',
  },
  {
    id: 'office_admin',
    label: 'Office & administration',
    detail: 'Office and administration costs',
  },
  {
    id: 'training_staff',
    label: 'Training & staff',
    detail: 'Training, uniforms and staff-related operating costs',
  },
  {
    id: 'recurring',
    label: 'Recurring contracts',
    detail: 'Recurring contracts and subscriptions',
  },
  {
    id: 'other',
    label: 'Other overheads',
    detail: 'Other approved overheads',
  },
] as const

const PREMISES_SUBS: ReadonlySet<CostSubcategory> = new Set([
  'rent',
  'rates',
  'utilities',
  'cleaning',
  'security',
])
const TECHNOLOGY_SUBS: ReadonlySet<CostSubcategory> = new Set([
  'software',
  'licence',
  'equipment',
  'telecoms',
  'subscription',
])
const PROFESSIONAL_SUBS: ReadonlySet<CostSubcategory> = new Set([
  'insurance',
  'accountancy',
  'legal',
  'consulting',
  'fees',
])
const OFFICE_SUBS: ReadonlySet<CostSubcategory> = new Set([
  'office_supplies',
  'banking_fees',
  'general',
])
const TRAINING_SUBS: ReadonlySet<CostSubcategory> = new Set(['training', 'uniforms'])
const RECURRING_SUBS: ReadonlySet<CostSubcategory> = new Set([
  'subscription',
  'contract',
  'licence',
  'rent',
  'telecoms',
  'software',
])

export function isOperatingCategory(category: CostCategory): boolean {
  return (OPERATING_CATEGORIES as readonly string[]).includes(category)
}

export function isOperatingCost(cost: CostRecord): boolean {
  return isOperatingCategory(cost.category) && cost.validationState !== 'quarantined'
}

export function listOperatingCosts(
  costs: CostRecord[],
  organisationId: OrganisationId,
): CostRecord[] {
  const org = requireOrganisationId(organisationId)
  return costs
    .filter((c) => c.organisationId === org && isOperatingCost(c))
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
}

/** Primary operating group for a cost — used for chips and row badges. */
export function operatingGroupFor(cost: CostRecord): OperatingGroupId {
  const sub = cost.subcategory ?? null

  if (cost.category === 'exceptional' || sub === 'overhead') return 'other'
  if (sub && TRAINING_SUBS.has(sub)) return 'training_staff'
  // Standalone contract rows (e.g. monitoring) sit under Recurring as primary.
  if (sub === 'contract') return 'recurring'
  if (cost.category === 'premises' || (sub && PREMISES_SUBS.has(sub))) return 'premises'
  if (cost.category === 'technology' || (sub && TECHNOLOGY_SUBS.has(sub))) return 'technology'
  if (cost.category === 'professional' || (sub && PROFESSIONAL_SUBS.has(sub))) {
    return 'insurance_professional'
  }
  if (
    cost.category === 'administration' ||
    (sub && OFFICE_SUBS.has(sub))
  ) {
    return 'office_admin'
  }
  return 'other'
}

export function costMatchesOperatingGroup(cost: CostRecord, group: OperatingGroupId | 'all'): boolean {
  if (group === 'all') return true
  if (group === 'recurring') {
    const sub = cost.subcategory ?? null
    return Boolean(sub && RECURRING_SUBS.has(sub))
  }
  return operatingGroupFor(cost) === group
}

export function deriveApprovalStatus(cost: CostRecord): ApprovalStatus {
  if (cost.reviewState === 'open' || cost.reviewState === 'snoozed') return 'under_review'
  if (cost.reviewState === 'rejected') return 'disputed'
  if (cost.reviewState === 'approved') return 'approved'
  if (cost.validationState === 'pending' || cost.validationState === 'quarantined') return 'draft'
  return 'approved'
}

export function deriveVatTreatment(cost: CostRecord): VatTreatment {
  if (cost.vatTreatment) return cost.vatTreatment
  if (cost.vat.amountMinor === 0) return 'zero_rated'
  return 'standard'
}

export function costCentreIdFor(cost: CostRecord): string {
  return cost.allocations.find((a) => a.costCentreId)?.costCentreId ?? 'unassigned'
}

export function amountsByLifecycle(cost: CostRecord): {
  actualMinor: number
  committedMinor: number
  forecastMinor: number
} {
  const amount = cost.gross.amountMinor
  return {
    actualMinor: cost.status === 'actual' ? amount : 0,
    committedMinor: cost.status === 'committed' ? amount : 0,
    forecastMinor: cost.status === 'forecast' || cost.status === 'estimated' ? amount : 0,
  }
}

/** Approved operating overhead — budget lines whose category is in the operating set. */
export function operatingApprovedMinor(budget: Budget): number {
  return budget.lines
    .filter((l) => isOperatingCategory(l.category))
    .reduce((sum, l) => sum + l.approvedMinor, 0)
}

export function computeOperatingPosition(input: {
  organisationId: OrganisationId
  budget: Budget
  costs: CostRecord[]
}): BudgetPosition {
  const org = requireOrganisationId(input.organisationId)
  const operating = listOperatingCosts(input.costs, org)
  const sums = sumLineByStatus(operating)
  return computeBudgetPosition({
    approvedMinor: operatingApprovedMinor(input.budget),
    ...sums,
  })
}

export type OperatingGroupRollup = OperatingGroup & {
  costs: CostRecord[]
  position: BudgetPosition
  /** Share of the single operating approved pool by projected final weight; zero when empty. */
  approvedShareMinor: number
}

export function rollupOperatingGroups(input: {
  organisationId: OrganisationId
  budget: Budget
  costs: CostRecord[]
}): OperatingGroupRollup[] {
  const org = requireOrganisationId(input.organisationId)
  const operating = listOperatingCosts(input.costs, org)
  const approvedPool = operatingApprovedMinor(input.budget)
  const poolProjected = sumLineByStatus(operating)
  const poolFinal =
    poolProjected.actualMinor + poolProjected.committedMinor + poolProjected.forecastMinor

  return OPERATING_GROUPS.map((group) => {
    const costs = operating.filter((c) => costMatchesOperatingGroup(c, group.id))
    const sums = sumLineByStatus(costs)
    const projectedFinal = sums.actualMinor + sums.committedMinor + sums.forecastMinor
    const approvedShareMinor =
      poolFinal <= 0
        ? Math.round(approvedPool / OPERATING_GROUPS.length)
        : Math.round((projectedFinal / poolFinal) * approvedPool)
    return {
      ...group,
      costs,
      approvedShareMinor,
      position: computeBudgetPosition({
        approvedMinor: approvedShareMinor,
        ...sums,
      }),
    }
  })
}

export type OperatingAttentionItem = {
  id: string
  severity: 'critical' | 'attention' | 'info'
  title: string
  detail: string
  costId?: string
  href?: string
}

export function listOperatingAttention(input: {
  organisationId: OrganisationId
  costs: CostRecord[]
  reviews: ReviewItem[]
  position: BudgetPosition
}): OperatingAttentionItem[] {
  const org = requireOrganisationId(input.organisationId)
  const operating = listOperatingCosts(input.costs, org)
  const operatingIds = new Set(operating.map((c) => c.id))
  const items: OperatingAttentionItem[] = []

  if (input.position.projectedRemainingMinor < 0) {
    items.push({
      id: 'ops_overspend',
      severity: 'critical',
      title: 'Projected operating overspend',
      detail:
        'Projected final cost exceeds the approved Premises & overhead budget. Review commitments and forecasts before period close.',
      href: '/budgets',
    })
  }

  for (const review of input.reviews) {
    if (review.state !== 'open') continue
    if (!operatingIds.has(review.costId)) continue
    items.push({
      id: review.id,
      severity: review.signal === 'projected_overspend' ? 'critical' : 'attention',
      title: review.title,
      detail: review.detail,
      costId: review.costId,
      href: '/reviews',
    })
  }

  const reviewCovered = new Set(
    input.reviews.filter((r) => r.state === 'open' && operatingIds.has(r.costId)).map((r) => r.costId),
  )

  for (const cost of operating) {
    const approval = deriveApprovalStatus(cost)
    if (approval === 'disputed') {
      items.push({
        id: `disputed_${cost.id}`,
        severity: 'critical',
        title: `Disputed — ${cost.supplierName}`,
        detail: cost.description,
        costId: cost.id,
      })
    } else if (approval === 'draft') {
      items.push({
        id: `draft_${cost.id}`,
        severity: 'info',
        title: `Draft — ${cost.supplierName}`,
        detail: 'Still draft; not yet submitted for review.',
        costId: cost.id,
      })
    } else if (approval === 'under_review' && !reviewCovered.has(cost.id)) {
      items.push({
        id: `review_${cost.id}`,
        severity: 'attention',
        title: `Under review — ${cost.supplierName}`,
        detail: cost.description,
        costId: cost.id,
        href: '/reviews',
      })
    }
    if (cost.evidence.length === 0 && cost.status !== 'forecast' && cost.status !== 'estimated') {
      items.push({
        id: `evidence_${cost.id}`,
        severity: 'attention',
        title: `Missing invoice — ${cost.supplierName}`,
        detail: `${cost.description} · ${cost.reference}`,
        costId: cost.id,
      })
    }
  }

  return items
}

export type OperatingLedgerFilters = {
  group: OperatingGroupId | 'all'
  approval: ApprovalStatus | 'all'
  lifecycle: CostRecord['status'] | 'all'
  query: string
  period: string | 'all'
}

export function filterOperatingLedger(
  costs: CostRecord[],
  filters: OperatingLedgerFilters,
): CostRecord[] {
  const q = filters.query.trim().toLowerCase()
  return costs.filter((c) => {
    if (!costMatchesOperatingGroup(c, filters.group)) return false
    if (filters.approval !== 'all' && deriveApprovalStatus(c) !== filters.approval) return false
    if (filters.lifecycle !== 'all' && c.status !== filters.lifecycle) return false
    if (filters.period !== 'all' && c.accountingPeriod !== filters.period) return false
    if (!q) return true
    const hay = `${c.supplierName} ${c.description} ${c.reference} ${c.category} ${c.subcategory ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
}
