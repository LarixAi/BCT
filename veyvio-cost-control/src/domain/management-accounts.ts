/**
 * Management accounts (income & expenditure) — not statutory accounts.
 * Income enters only as a controlled summary import from the accounting system.
 * Detailed invoicing / customer management stays outside Veyvio (cost-only boundary).
 */

import { computeBudgetPosition } from './budget-equations'
import { costsForBudgetLine, sumLineByStatus } from './budget-hierarchy'
import { trafficLightForVariance, type TrafficLight } from './budget-governance'
import { requireOrganisationId } from './tenancy'
import type { Budget, CostCategory, CostRecord, OrganisationId } from './types'

export type IncomeSummaryKind = 'contract_income' | 'other_income' | 'finance_income'

export type IncomeSummaryLine = {
  id: string
  label: string
  kind: IncomeSummaryKind
  actualMinor: number
  budgetMinor: number
  forecastMinor: number
}

export type IncomeSummaryImport = {
  id: string
  organisationId: OrganisationId
  periodLabel: string
  sourceSystem: string
  importedAt: string
  /** Accountant must approve mappings before board pack use. */
  approvedByAccountant: string | null
  lines: IncomeSummaryLine[]
}

export type ManagementAccountsLineKind =
  | 'income'
  | 'direct_cost'
  | 'gross'
  | 'overhead'
  | 'depreciation'
  | 'result'

export type ManagementAccountsLine = {
  id: string
  label: string
  kind: ManagementAccountsLineKind
  actualMinor: number
  budgetMinor: number
  forecastMinor: number
  varianceMinor: number
  /** Display as cost (parentheses) when true. */
  isExpense: boolean
  light: TrafficLight
}

function sumIncome(lines: IncomeSummaryLine[], field: 'actualMinor' | 'budgetMinor' | 'forecastMinor') {
  return lines.reduce((s, l) => s + l[field], 0)
}

function categorySpend(
  costs: CostRecord[],
  budget: Budget,
  organisationId: OrganisationId,
  category: CostCategory,
): { actualMinor: number; committedMinor: number; forecastMinor: number; approvedMinor: number } {
  const line = budget.lines.find((l) => l.category === category)
  const approvedMinor = line?.approvedMinor ?? 0
  const lineCosts = costsForBudgetLine(costs, budget.id, category, organisationId)
  const sums = sumLineByStatus(lineCosts)
  return { approvedMinor, ...sums }
}

function expenseLine(
  id: string,
  label: string,
  kind: ManagementAccountsLineKind,
  actualMinor: number,
  budgetMinor: number,
  forecastMinor: number,
  dataComplete: boolean,
): ManagementAccountsLine {
  const varianceMinor = budgetMinor - actualMinor
  return {
    id,
    label,
    kind,
    actualMinor,
    budgetMinor,
    forecastMinor,
    varianceMinor,
    isExpense: true,
    light: trafficLightForVariance({
      varianceToApprovedMinor: varianceMinor,
      approvedMinor: budgetMinor,
      dataComplete,
    }),
  }
}

/**
 * Transport-company management I&E / P&L view.
 * Marked as management accounts — not statutory.
 */
export function buildManagementAccounts(input: {
  organisationId: OrganisationId
  budget: Budget
  costs: CostRecord[]
  income: IncomeSummaryImport | null
  /** Non-cash depreciation charge for the period (accountant-approved). */
  depreciationActualMinor?: number
  depreciationBudgetMinor?: number
  depreciationForecastMinor?: number
}): {
  title: string
  subtitle: string
  incomeApproved: boolean
  lines: ManagementAccountsLine[]
  operatingResultActualMinor: number
  operatingResultBudgetMinor: number
  operatingResultForecastMinor: number
} {
  const org = requireOrganisationId(input.organisationId)
  const incomeLines = input.income?.lines ?? []
  const incomeApproved = Boolean(input.income?.approvedByAccountant)
  const dataComplete = incomeApproved

  const incomeActual = sumIncome(incomeLines, 'actualMinor')
  const incomeBudget = sumIncome(incomeLines, 'budgetMinor')
  const incomeForecast = sumIncome(incomeLines, 'forecastMinor')

  const wages = categorySpend(input.costs, input.budget, org, 'wages')
  const fuel = categorySpend(input.costs, input.budget, org, 'fuel')
  const maint = categorySpend(input.costs, input.budget, org, 'maintenance')
  const own = categorySpend(input.costs, input.budget, org, 'vehicle_ownership')

  const wagesPos = computeBudgetPosition({
    approvedMinor: wages.approvedMinor,
    actualMinor: wages.actualMinor,
    committedMinor: wages.committedMinor,
    forecastMinor: wages.forecastMinor,
  })
  const fuelPos = computeBudgetPosition({
    approvedMinor: fuel.approvedMinor,
    actualMinor: fuel.actualMinor,
    committedMinor: fuel.committedMinor,
    forecastMinor: fuel.forecastMinor,
  })
  const maintPos = computeBudgetPosition({
    approvedMinor: maint.approvedMinor,
    actualMinor: maint.actualMinor,
    committedMinor: maint.committedMinor,
    forecastMinor: maint.forecastMinor,
  })
  const ownPos = computeBudgetPosition({
    approvedMinor: own.approvedMinor,
    actualMinor: own.actualMinor,
    committedMinor: own.committedMinor,
    forecastMinor: own.forecastMinor,
  })

  const directActual =
    wagesPos.actualMinor + fuelPos.actualMinor + maintPos.actualMinor + ownPos.actualMinor
  const directBudget =
    wages.approvedMinor + fuel.approvedMinor + maint.approvedMinor + own.approvedMinor
  const directForecast =
    wagesPos.projectedFinalMinor +
    fuelPos.projectedFinalMinor +
    maintPos.projectedFinalMinor +
    ownPos.projectedFinalMinor

  const grossActual = incomeActual - directActual
  const grossBudget = incomeBudget - directBudget
  const grossForecast = incomeForecast - directForecast

  const premises = categorySpend(input.costs, input.budget, org, 'premises')
  const tech = categorySpend(input.costs, input.budget, org, 'technology')
  const prof = categorySpend(input.costs, input.budget, org, 'professional')
  const admin = categorySpend(input.costs, input.budget, org, 'administration')
  const excep = categorySpend(input.costs, input.budget, org, 'exceptional')

  const premisesLine = input.budget.lines.find((l) => l.category === 'premises')
  const overheadApproved = premisesLine?.approvedMinor ?? 0
  // Single CEC overhead line funds premises + technology + professional + admin + exceptional.
  const overheadActual =
    premises.actualMinor + tech.actualMinor + prof.actualMinor + admin.actualMinor + excep.actualMinor
  const overheadForecast =
    computeBudgetPosition({ approvedMinor: 0, ...premises }).projectedFinalMinor +
    computeBudgetPosition({ approvedMinor: 0, ...tech }).projectedFinalMinor +
    computeBudgetPosition({ approvedMinor: 0, ...prof }).projectedFinalMinor +
    computeBudgetPosition({ approvedMinor: 0, ...admin }).projectedFinalMinor +
    computeBudgetPosition({ approvedMinor: 0, ...excep }).projectedFinalMinor
  const overheadBudget = overheadApproved

  const depActual = input.depreciationActualMinor ?? 12_000_00
  const depBudget = input.depreciationBudgetMinor ?? 48_000_00
  const depForecast = input.depreciationForecastMinor ?? depBudget

  const opActual = grossActual - overheadActual - depActual
  const opBudget = grossBudget - overheadBudget - depBudget
  const opForecast = grossForecast - overheadForecast - depForecast

  const contract = incomeLines.filter((l) => l.kind === 'contract_income')
  const other = incomeLines.filter((l) => l.kind === 'other_income')

  const lines: ManagementAccountsLine[] = [
    {
      id: 'contract_income',
      label: 'Contract and service income',
      kind: 'income',
      actualMinor: sumIncome(contract, 'actualMinor'),
      budgetMinor: sumIncome(contract, 'budgetMinor'),
      forecastMinor: sumIncome(contract, 'forecastMinor'),
      varianceMinor: sumIncome(contract, 'actualMinor') - sumIncome(contract, 'budgetMinor'),
      isExpense: false,
      light: dataComplete ? 'green' : 'grey',
    },
    {
      id: 'other_income',
      label: 'Other operating income',
      kind: 'income',
      actualMinor: sumIncome(other, 'actualMinor'),
      budgetMinor: sumIncome(other, 'budgetMinor'),
      forecastMinor: sumIncome(other, 'forecastMinor'),
      varianceMinor: sumIncome(other, 'actualMinor') - sumIncome(other, 'budgetMinor'),
      isExpense: false,
      light: dataComplete ? 'green' : 'grey',
    },
    {
      id: 'total_income',
      label: 'Total income',
      kind: 'income',
      actualMinor: incomeActual,
      budgetMinor: incomeBudget,
      forecastMinor: incomeForecast,
      varianceMinor: incomeActual - incomeBudget,
      isExpense: false,
      light: dataComplete ? 'green' : 'grey',
    },
    expenseLine('wages', 'Driver wages', 'direct_cost', wagesPos.actualMinor, wages.approvedMinor, wagesPos.projectedFinalMinor, true),
    expenseLine('fuel', 'Fuel and AdBlue', 'direct_cost', fuelPos.actualMinor, fuel.approvedMinor, fuelPos.projectedFinalMinor, true),
    expenseLine('maint', 'Maintenance and MOT', 'direct_cost', maintPos.actualMinor, maint.approvedMinor, maintPos.projectedFinalMinor, true),
    expenseLine('vehicle', 'Vehicle operating costs', 'direct_cost', ownPos.actualMinor, own.approvedMinor, ownPos.projectedFinalMinor, true),
    {
      id: 'gross',
      label: 'Gross contribution',
      kind: 'gross',
      actualMinor: grossActual,
      budgetMinor: grossBudget,
      forecastMinor: grossForecast,
      varianceMinor: grossActual - grossBudget,
      isExpense: false,
      light: trafficLightForVariance({
        varianceToApprovedMinor: grossActual - grossBudget,
        approvedMinor: Math.max(Math.abs(grossBudget), 1),
        dataComplete,
      }),
    },
    expenseLine(
      'overhead',
      'Premises and overhead',
      'overhead',
      overheadActual,
      overheadBudget,
      overheadForecast,
      true,
    ),
    expenseLine(
      'insurance_prof',
      'Insurance and professional fees (of which)',
      'overhead',
      prof.actualMinor,
      Math.round(overheadBudget * 0.25),
      computeBudgetPosition({ approvedMinor: 0, ...prof }).projectedFinalMinor,
      true,
    ),
    expenseLine('depreciation', 'Depreciation', 'depreciation', depActual, depBudget, depForecast, dataComplete),
    {
      id: 'operating_result',
      label: 'Operating surplus / (deficit)',
      kind: 'result',
      actualMinor: opActual,
      budgetMinor: opBudget,
      forecastMinor: opForecast,
      varianceMinor: opActual - opBudget,
      isExpense: false,
      light: trafficLightForVariance({
        varianceToApprovedMinor: opActual - opBudget,
        approvedMinor: Math.max(Math.abs(opBudget), 1),
        dataComplete,
      }),
    },
  ]

  return {
    title: 'Management accounts',
    subtitle: input.income
      ? `Income summary from ${input.income.sourceSystem} · ${input.income.periodLabel}`
      : 'Income summary not yet imported — cost lines only',
    incomeApproved,
    lines,
    operatingResultActualMinor: opActual,
    operatingResultBudgetMinor: opBudget,
    operatingResultForecastMinor: opForecast,
  }
}
