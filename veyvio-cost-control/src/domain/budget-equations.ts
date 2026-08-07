/**
 * Authoritative budget equations — Blueprint §5.
 * AI and UI must call these; they must not invent totals.
 */

export const FORMULA_VERSION = 'cost-control.budget.v1'

export type BudgetPositionInput = {
  approvedMinor: number
  actualMinor: number
  committedMinor: number
  forecastMinor: number
}

export type BudgetPosition = BudgetPositionInput & {
  availableMinor: number
  projectedRemainingMinor: number
  projectedFinalMinor: number
  /** approved − projectedFinal (negative = overspend risk) */
  varianceToApprovedMinor: number
  formulaVersion: string
}

/** AVAILABLE BUDGET = approved − actual − committed */
export function availableBudget(approvedMinor: number, actualMinor: number, committedMinor: number): number {
  return approvedMinor - actualMinor - committedMinor
}

/** PROJECTED REMAINING = approved − actual − committed − forecast */
export function projectedRemainingBudget(
  approvedMinor: number,
  actualMinor: number,
  committedMinor: number,
  forecastMinor: number,
): number {
  return approvedMinor - actualMinor - committedMinor - forecastMinor
}

/** PROJECTED FINAL COST = actual + committed + forecast (no double count) */
export function projectedFinalCost(actualMinor: number, committedMinor: number, forecastMinor: number): number {
  return actualMinor + committedMinor + forecastMinor
}

export function computeBudgetPosition(input: BudgetPositionInput): BudgetPosition {
  const availableMinor = availableBudget(input.approvedMinor, input.actualMinor, input.committedMinor)
  const projectedRemainingMinor = projectedRemainingBudget(
    input.approvedMinor,
    input.actualMinor,
    input.committedMinor,
    input.forecastMinor,
  )
  const projectedFinalMinor = projectedFinalCost(input.actualMinor, input.committedMinor, input.forecastMinor)
  return {
    ...input,
    availableMinor,
    projectedRemainingMinor,
    projectedFinalMinor,
    varianceToApprovedMinor: input.approvedMinor - projectedFinalMinor,
    formulaVersion: FORMULA_VERSION,
  }
}
