import { addMinor } from './money'
import type { OrganisationId } from './types'

/** Payroll Cost Control — Phase 1 domain (employer cost only; no PAYE engine). */

export type PayFrequency = 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly'

export type PayPeriodLifecycle =
  | 'forecast'
  | 'draft'
  | 'imported'
  | 'review'
  | 'approved'
  | 'processing'
  | 'final_imported'
  | 'published'
  | 'exception'

export type PayrollImportStage = 'forecast' | 'pre_payroll' | 'final'

/** Employer-side cost components — never include employee PAYE/NI deductions as cost. */
export type EmployerPayrollCostInput = {
  grossWagesMinor: number
  employerNiMinor: number
  employerPensionMinor: number
  overtimeMinor: number
  allowancesMinor: number
  agencyMinor: number
  statutoryEmployerCostMinor: number
  otherEmployerCostMinor: number
  /** Recoveries / Employment Allowance-style offsets that reduce employer cost. */
  recoveriesMinor?: number
}

export type EmployerPayrollCostBreakdown = EmployerPayrollCostInput & {
  totalEmployerCostMinor: number
  formulaVersion: typeof PAYROLL_COST_FORMULA_VERSION
}

export const PAYROLL_COST_FORMULA_VERSION = 'cost-control.payroll-employer.v1' as const

/**
 * Total employer payroll cost (Phase 1).
 * Gross + employer NI + employer pension + OT + allowances + agency + statutory employer cost
 * + other − recoveries.
 * Employee deductions must never be passed in.
 */
export function computeEmployerPayrollCost(
  input: EmployerPayrollCostInput,
): EmployerPayrollCostBreakdown {
  assertNonNegativeComponents(input)
  const recoveries = input.recoveriesMinor ?? 0
  if (recoveries < 0) throw new Error('Recoveries must be >= 0')

  const totalEmployerCostMinor = addMinor(
    input.grossWagesMinor,
    input.employerNiMinor,
    input.employerPensionMinor,
    input.overtimeMinor,
    input.allowancesMinor,
    input.agencyMinor,
    input.statutoryEmployerCostMinor,
    input.otherEmployerCostMinor,
    -recoveries,
  )

  return {
    ...input,
    recoveriesMinor: recoveries,
    totalEmployerCostMinor,
    formulaVersion: PAYROLL_COST_FORMULA_VERSION,
  }
}

function assertNonNegativeComponents(input: EmployerPayrollCostInput): void {
  const keys: Array<keyof EmployerPayrollCostInput> = [
    'grossWagesMinor',
    'employerNiMinor',
    'employerPensionMinor',
    'overtimeMinor',
    'allowancesMinor',
    'agencyMinor',
    'statutoryEmployerCostMinor',
    'otherEmployerCostMinor',
  ]
  for (const key of keys) {
    const v = input[key] ?? 0
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`${key} must be a non-negative integer minor amount`)
    }
  }
}

export type PayrollBudgetVariance = {
  budgetedMinor: number
  actualOrExpectedMinor: number
  varianceMinor: number
  /** Basis points-style percent × 10 (e.g. 3.1% → 310) avoided — store percent × 100 as integer. */
  variancePercentHundredths: number
}

export function computePayrollBudgetVariance(
  budgetedMinor: number,
  actualOrExpectedMinor: number,
): PayrollBudgetVariance {
  if (!Number.isInteger(budgetedMinor) || !Number.isInteger(actualOrExpectedMinor)) {
    throw new Error('Variance inputs must be integer minor units')
  }
  const varianceMinor = actualOrExpectedMinor - budgetedMinor
  const variancePercentHundredths =
    budgetedMinor === 0 ? 0 : Math.round((varianceMinor / budgetedMinor) * 10_000)
  return {
    budgetedMinor,
    actualOrExpectedMinor,
    varianceMinor,
    variancePercentHundredths,
  }
}

export type PayPeriod = {
  id: string
  organisationId: OrganisationId
  label: string
  taxYear: string
  frequency: PayFrequency
  periodNumber: number
  periodStart: string
  periodEnd: string
  contractualPayday: string
  status: PayPeriodLifecycle
  providerName: string
  /** Protected scheme reference token — not a full PAYE credentials store. */
  schemeRefToken: string
  employeeCount: number
  budgetedEmployerCostMinor: number
  forecast: EmployerPayrollCostBreakdown
  /** Stage 2 pre-payroll import result when present. */
  prePayroll: EmployerPayrollCostBreakdown | null
  /** Stage 3 final import when present. */
  finalPayroll: EmployerPayrollCostBreakdown | null
  exceptions: PayrollCostException[]
  lastImportAt: string | null
  formulaVersion: typeof PAYROLL_COST_FORMULA_VERSION
}

export type PayrollCostException = {
  id: string
  severity: 'info' | 'attention' | 'critical'
  code: string
  title: string
  detail: string
}

/** Active employer cost for UI: prefer final → pre → forecast. */
export function resolveDisplayedEmployerCost(period: PayPeriod): EmployerPayrollCostBreakdown {
  return period.finalPayroll ?? period.prePayroll ?? period.forecast
}

export function openPayrollExceptionCount(period: PayPeriod): number {
  return period.exceptions.filter((e) => e.severity !== 'info').length
}
