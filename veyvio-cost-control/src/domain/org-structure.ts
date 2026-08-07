import type { OrganisationId } from './types'

/**
 * Organisational structure + employee cost references for Payroll Cost Control.
 * Person profiles are employer-cost / pay-input views — not Command admin staff records,
 * not a full PAYE engine. Sensitive fields are stored masked for demo only.
 */

export type EmploymentKind =
  | 'board'
  | 'employed'
  | 'volunteer'
  | 'contractor'
  | 'agency'

export type OrgDivision =
  | 'members'
  | 'board'
  | 'executive'
  | 'operations_fleet'
  | 'finance_admin'
  | 'people_safety_community'
  | 'yard'
  | 'drivers'

export type OrgNode = {
  id: string
  organisationId: OrganisationId
  parentId: string | null
  title: string
  division: OrgDivision
  summary: string
  sortOrder: number
}

/** Inputs that explain employer cost — not HMRC calculation outputs. */
export type PersonPayInputs = {
  contractedHoursPerWeek: number
  hoursCompletedThisPeriod: number
  overtimeHoursThisPeriod: number
  holidayDaysEntitlement: number
  holidayDaysTaken: number
  sickDaysThisPeriod: number
  /** Basic contractual pay for the period (employer cost input). */
  basicPayMinor: number
  hourlyRateMinor: number
  /** Masked only — never store full NI in Cost Control Phase 2. */
  niNumberMasked: string
  /** Masked sort code + last4 — never full account number. */
  bankSortCodeMasked: string
  bankAccountMasked: string
  bankName: string
  /** Deterministic avatar colour seed (0–359). */
  avatarHue: number
}

/** Payroll matching + cost allocation identity. */
export type EmployeeCostReference = {
  id: string
  organisationId: OrganisationId
  /** External id from recognised payroll provider (or internal stub). */
  externalPayrollId: string
  displayName: string
  orgNodeId: string
  roleTitle: string
  costCentre: string
  employmentKind: EmploymentKind
  /** True when this person contributes employer wage cost in the active period. */
  wageCostBearing: boolean
  expectedEmployerCostMinor: number
  overtimeMinor: number
  employerNiMinor: number
  employerPensionMinor: number
  allocationComplete: boolean
  active: boolean
  /** Present for wage-cost members; optional for unpaid board/volunteers. */
  payInputs?: PersonPayInputs
}

export type OrgTreeNode = OrgNode & { children: OrgTreeNode[] }

export function buildOrgTree(nodes: OrgNode[]): OrgTreeNode[] {
  const byParent = new Map<string | null, OrgNode[]>()
  for (const n of nodes) {
    const list = byParent.get(n.parentId) ?? []
    list.push(n)
    byParent.set(n.parentId, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
  }

  function walk(parentId: string | null): OrgTreeNode[] {
    return (byParent.get(parentId) ?? []).map((n) => ({
      ...n,
      children: walk(n.id),
    }))
  }

  return walk(null)
}

/** Members who generate employer wage cost (excludes unpaid board/volunteers unless flagged). */
export function listWageCostMembers(
  people: EmployeeCostReference[],
  opts?: { activeOnly?: boolean },
): EmployeeCostReference[] {
  const activeOnly = opts?.activeOnly ?? true
  return people
    .filter((p) => p.wageCostBearing)
    .filter((p) => (activeOnly ? p.active : true))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export function sumExpectedEmployerCost(people: EmployeeCostReference[]): number {
  return listWageCostMembers(people).reduce((s, p) => s + p.expectedEmployerCostMinor, 0)
}

export function incompleteAllocationCount(people: EmployeeCostReference[]): number {
  return listWageCostMembers(people).filter((p) => !p.allocationComplete).length
}

export function countByEmploymentKind(
  people: EmployeeCostReference[],
): Record<EmploymentKind, number> {
  const base: Record<EmploymentKind, number> = {
    board: 0,
    employed: 0,
    volunteer: 0,
    contractor: 0,
    agency: 0,
  }
  for (const p of listWageCostMembers(people)) {
    base[p.employmentKind] += 1
  }
  return base
}

export function findEmployeeCostReference(
  people: EmployeeCostReference[],
  id: string,
): EmployeeCostReference | undefined {
  return people.find((p) => p.id === id)
}

export function personInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

/** Hours utilisation for the period (capped display helper). */
export function hoursUtilisationPercent(inputs: PersonPayInputs): number {
  const contractedPeriod = inputs.contractedHoursPerWeek * (52 / 12) // monthly approx
  if (contractedPeriod <= 0) return 0
  return Math.round((inputs.hoursCompletedThisPeriod / contractedPeriod) * 100)
}

export function holidayRemainingDays(inputs: PersonPayInputs): number {
  return Math.max(0, inputs.holidayDaysEntitlement - inputs.holidayDaysTaken)
}

/** Reconcile profile pay inputs to displayed employer cost (basic + OT + NI + pension). */
export function personCostComposition(person: EmployeeCostReference): {
  basicPayMinor: number
  overtimeMinor: number
  employerNiMinor: number
  employerPensionMinor: number
  totalMinor: number
  matchesExpected: boolean
} {
  const basic = person.payInputs?.basicPayMinor ?? 0
  const overtime = person.overtimeMinor
  const ni = person.employerNiMinor
  const pension = person.employerPensionMinor
  const total = basic + overtime + ni + pension
  return {
    basicPayMinor: basic,
    overtimeMinor: overtime,
    employerNiMinor: ni,
    employerPensionMinor: pension,
    totalMinor: total,
    matchesExpected: total === person.expectedEmployerCostMinor,
  }
}
