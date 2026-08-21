import { computeBudgetPosition, FORMULA_VERSION, type BudgetPosition } from './budget-equations'
import type { Budget, CostRecord, FinancialSnapshot } from './types'

/**
 * Sum ledger costs by lifecycle status for one budget.
 * Converted commitments linked to actuals are excluded from committed totals
 * when linkedCommitmentId is set on the actual (double-count prevention).
 */
export function sumCostsForBudget(costs: CostRecord[], budgetId: string) {
  const inBudget = costs.filter(
    (c) =>
      c.validationState !== 'quarantined' &&
      c.allocations.some((a) => a.budgetId === budgetId),
  )

  let actualMinor = 0
  let committedMinor = 0
  let forecastMinor = 0

  const convertedCommitmentIds = new Set(
    inBudget.filter((c) => c.status === 'actual' && c.linkedCommitmentId).map((c) => c.linkedCommitmentId!),
  )

  for (const cost of inBudget) {
    const amount = cost.gross.amountMinor
    if (cost.status === 'actual') actualMinor += amount
    else if (cost.status === 'committed') {
      if (!convertedCommitmentIds.has(cost.id)) committedMinor += amount
    } else if (cost.status === 'forecast' || cost.status === 'estimated') {
      forecastMinor += amount
    }
  }

  return { actualMinor, committedMinor, forecastMinor }
}

export function buildFinancialSnapshot(input: {
  organisationId: string
  budget: Budget
  costs: CostRecord[]
  nowIso?: string
}): FinancialSnapshot & { position: BudgetPosition } {
  const approvedMinor =
    input.budget.lines.reduce((s, l) => s + l.approvedMinor, 0) + input.budget.contingencyMinor
  const sums = sumCostsForBudget(input.costs, input.budget.id)
  const position = computeBudgetPosition({
    approvedMinor,
    ...sums,
  })
  const now = input.nowIso ?? new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    organisationId: input.organisationId,
    calculationId: crypto.randomUUID(),
    formulaVersion: FORMULA_VERSION,
    createdAt: now,
    budgetId: input.budget.id,
    budgetVersion: input.budget.version,
    approvedMinor: position.approvedMinor,
    actualMinor: position.actualMinor,
    committedMinor: position.committedMinor,
    forecastMinor: position.forecastMinor,
    availableMinor: position.availableMinor,
    projectedRemainingMinor: position.projectedRemainingMinor,
    projectedFinalMinor: position.projectedFinalMinor,
    varianceToApprovedMinor: position.varianceToApprovedMinor,
    position,
  }
}
