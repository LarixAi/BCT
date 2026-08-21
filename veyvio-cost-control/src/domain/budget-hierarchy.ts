import { computeBudgetPosition, type BudgetPosition } from './budget-equations'
import type { Budget, BudgetLine, CostCategory, CostRecord, OrganisationId } from './types'
import { requireOrganisationId } from './tenancy'

/**
 * CEC budget hierarchy + variance drill — Blueprint §9 / §7 CEC budget.
 * Levels: Organisation → Financial year → Programme budget → Category line → (optional) cost centre.
 */

export type BudgetHierarchyLevel =
  | 'organisation'
  | 'financial_year'
  | 'programme'
  | 'category'
  | 'cost_centre'

export type BudgetHierarchyNode = {
  id: string
  level: BudgetHierarchyLevel
  label: string
  code?: string
  approvedMinor: number
  position: BudgetPosition
  children: BudgetHierarchyNode[]
  /** Present on category nodes — drill target. */
  lineId?: string
  category?: CostCategory
}

export type BudgetLineVariance = {
  line: BudgetLine
  position: BudgetPosition
  costs: CostRecord[]
  overProjected: boolean
  variancePercentHundredths: number
}

export function costsForBudgetLine(
  costs: CostRecord[],
  budgetId: string,
  category: CostCategory,
  organisationId: OrganisationId,
): CostRecord[] {
  const org = requireOrganisationId(organisationId)
  return costs.filter(
    (c) =>
      c.organisationId === org &&
      c.validationState !== 'quarantined' &&
      c.allocations.some((a) => a.budgetId === budgetId && a.category === category),
  )
}

export function sumLineByStatus(costs: CostRecord[]): {
  actualMinor: number
  committedMinor: number
  forecastMinor: number
} {
  let actualMinor = 0
  let committedMinor = 0
  let forecastMinor = 0
  const converted = new Set(
    costs.filter((c) => c.status === 'actual' && c.linkedCommitmentId).map((c) => c.linkedCommitmentId!),
  )
  for (const c of costs) {
    const amount = c.gross.amountMinor
    if (c.status === 'actual') actualMinor += amount
    else if (c.status === 'committed' && !converted.has(c.id)) committedMinor += amount
    else if (c.status === 'forecast' || c.status === 'estimated') forecastMinor += amount
  }
  return { actualMinor, committedMinor, forecastMinor }
}

export function computeLineVariance(
  line: BudgetLine,
  costs: CostRecord[],
  budgetId: string,
  organisationId: OrganisationId,
): BudgetLineVariance {
  const lineCosts = costsForBudgetLine(costs, budgetId, line.category, organisationId)
  const sums = sumLineByStatus(lineCosts)
  const position = computeBudgetPosition({
    approvedMinor: line.approvedMinor,
    ...sums,
  })
  const variancePercentHundredths =
    line.approvedMinor === 0
      ? 0
      : Math.round(((position.projectedFinalMinor - line.approvedMinor) / line.approvedMinor) * 10_000)
  return {
    line,
    position,
    costs: lineCosts.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)),
    overProjected: position.projectedRemainingMinor < 0,
    variancePercentHundredths,
  }
}

export function buildCecBudgetHierarchy(input: {
  organisationId: OrganisationId
  organisationName: string
  budget: Budget
  costs: CostRecord[]
}): BudgetHierarchyNode {
  const orgId = requireOrganisationId(input.organisationId)
  const lineNodes: BudgetHierarchyNode[] = input.budget.lines.map((line) => {
    const variance = computeLineVariance(line, input.costs, input.budget.id, orgId)
    return {
      id: line.id,
      level: 'category' as const,
      label: line.label,
      code: line.category,
      approvedMinor: line.approvedMinor,
      position: variance.position,
      children: [],
      lineId: line.id,
      category: line.category,
    }
  })

  const contingencyPosition = computeBudgetPosition({
    approvedMinor: input.budget.contingencyMinor,
    actualMinor: 0,
    committedMinor: 0,
    forecastMinor: 0,
  })

  const programmeChildren = [
    ...lineNodes,
    {
      id: `${input.budget.id}_contingency`,
      level: 'category' as const,
      label: 'Contingency (reserved)',
      approvedMinor: input.budget.contingencyMinor,
      position: contingencyPosition,
      children: [],
    },
  ]

  const programmeApproved =
    input.budget.lines.reduce((s, l) => s + l.approvedMinor, 0) + input.budget.contingencyMinor
  const programmeSums = sumProgramme(input.costs, input.budget.id, orgId)
  const programmePosition = computeBudgetPosition({
    approvedMinor: programmeApproved,
    ...programmeSums,
  })

  const programme: BudgetHierarchyNode = {
    id: input.budget.id,
    level: 'programme',
    label: input.budget.name,
    code: input.budget.code,
    approvedMinor: programmeApproved,
    position: programmePosition,
    children: programmeChildren,
  }

  const yearNode: BudgetHierarchyNode = {
    id: `fy_${input.budget.financialYear}`,
    level: 'financial_year',
    label: `Financial year ${input.budget.financialYear}`,
    code: input.budget.financialYear,
    approvedMinor: programmeApproved,
    position: programmePosition,
    children: [programme],
  }

  return {
    id: orgId,
    level: 'organisation',
    label: input.organisationName,
    approvedMinor: programmeApproved,
    position: programmePosition,
    children: [yearNode],
  }
}

function sumProgramme(costs: CostRecord[], budgetId: string, organisationId: OrganisationId) {
  const inBudget = costs.filter(
    (c) =>
      c.organisationId === organisationId &&
      c.validationState !== 'quarantined' &&
      c.allocations.some((a) => a.budgetId === budgetId),
  )
  return sumLineByStatus(inBudget)
}

export function findBudgetLine(budget: Budget, lineId: string): BudgetLine | undefined {
  return budget.lines.find((l) => l.id === lineId)
}
