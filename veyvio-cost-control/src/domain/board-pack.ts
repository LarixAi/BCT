/**
 * Board pack — generated from a locked (or finance-approved) quarterly snapshot.
 * Management pack only — not statutory accounts.
 */

import type { BudgetPosition } from './budget-equations'
import type { TrafficLight } from './budget-governance'
import type { CashFlowSnapshot } from './cash-flow-view'
import type { ManagementAccountsLine } from './management-accounts'
import type { QuarterlyCategoryRow, QuarterlyReview } from './quarterly-review'

export type BoardPackSectionId =
  | 'executive_summary'
  | 'income_expenditure'
  | 'budget_vs_actual'
  | 'full_year_forecast'
  | 'cash_flow'
  | 'cost_category'
  | 'wage_analysis'
  | 'fuel_maintenance'
  | 'commitments_suppliers'
  | 'risks_actions'
  | 'data_quality'

export type BoardPackSection = {
  id: BoardPackSectionId
  title: string
  summary: string
  light: TrafficLight
}

export type BoardPack = {
  title: string
  subtitle: string
  quarterLabel: string
  locked: boolean
  version: number
  overallLight: TrafficLight
  sections: BoardPackSection[]
  categoryRows: QuarterlyCategoryRow[]
  managementLines: ManagementAccountsLine[]
  cashFlow: CashFlowSnapshot
  programmePosition: BudgetPosition
}

export function buildBoardPack(input: {
  organisationName: string
  budgetCode: string
  review: QuarterlyReview
  categoryRows: QuarterlyCategoryRow[]
  managementLines: ManagementAccountsLine[]
  cashFlow: CashFlowSnapshot
  programmePosition: BudgetPosition
  wageVarianceMinor: number
  openReviewCount: number
  quarantineCount: number
}): BoardPack {
  const locked = input.review.status === 'locked'
  const adverse = input.categoryRows.filter((r) => r.light === 'red')
  const atRisk = input.categoryRows.filter((r) => r.light === 'amber')
  const overallLight: TrafficLight =
    input.quarantineCount > 0 || !locked && input.review.status === 'open'
      ? input.quarantineCount > 0
        ? 'grey'
        : adverse.length
          ? 'red'
          : atRisk.length
            ? 'amber'
            : 'green'
      : adverse.length
        ? 'red'
        : atRisk.length
          ? 'amber'
          : 'green'

  const sections: BoardPackSection[] = [
    {
      id: 'executive_summary',
      title: 'Executive financial summary',
      summary: `Projected remaining ${input.programmePosition.projectedRemainingMinor < 0 ? 'is adverse' : 'is within plan'}. ${adverse.length} categor${adverse.length === 1 ? 'y' : 'ies'} red, ${atRisk.length} amber.`,
      light: overallLight,
    },
    {
      id: 'income_expenditure',
      title: 'Profit-and-loss / income & expenditure',
      summary: 'Management accounts from imported income summary and cost ledger.',
      light: input.managementLines.find((l) => l.id === 'operating_result')?.light ?? 'grey',
    },
    {
      id: 'budget_vs_actual',
      title: 'Budget-versus-actual results',
      summary: `${input.categoryRows.length} CEC lines with quarter and YTD actuals.`,
      light: overallLight,
    },
    {
      id: 'full_year_forecast',
      title: 'Full-year forecast',
      summary: `Projected final cost versus revised approved budget.`,
      light:
        input.programmePosition.projectedRemainingMinor < 0
          ? 'red'
          : input.programmePosition.varianceToApprovedMinor <
              input.programmePosition.approvedMinor * 0.03
            ? 'amber'
            : 'green',
    },
    {
      id: 'cash_flow',
      title: 'Cash-flow forecast',
      summary: input.cashFlow.warning ?? 'Adequate headroom across the short-term horizon.',
      light: input.cashFlow.lowestBalanceMinor < 0 ? 'red' : input.cashFlow.warning ? 'amber' : 'green',
    },
    {
      id: 'cost_category',
      title: 'Cost-category analysis',
      summary: 'Category roll-up from the trusted cost ledger.',
      light: overallLight,
    },
    {
      id: 'wage_analysis',
      title: 'Wage-cost analysis',
      summary:
        input.wageVarianceMinor > 0
          ? 'Employer wage cost above period budget — see wage hub.'
          : 'Wage-cost position within period budget.',
      light: input.wageVarianceMinor > 0 ? 'amber' : 'green',
    },
    {
      id: 'fuel_maintenance',
      title: 'Fuel and maintenance trends',
      summary: 'Fuel and maintenance lines from the quarterly category table.',
      light:
        input.categoryRows.find((r) => r.line.category === 'fuel' || r.line.category === 'maintenance')
          ?.light ?? 'green',
    },
    {
      id: 'commitments_suppliers',
      title: 'Major commitments and supplier exposure',
      summary: 'Open commitments remain until converted to actual.',
      light: 'green',
    },
    {
      id: 'risks_actions',
      title: 'Risks, decisions and proposed actions',
      summary: `${input.categoryRows.filter((r) => r.review?.boardApprovalRequired).length} item(s) flagged for board approval.`,
      light: adverse.length ? 'red' : 'amber',
    },
    {
      id: 'data_quality',
      title: 'Data-quality and reconciliation statement',
      summary:
        input.quarantineCount || input.openReviewCount
          ? `${input.openReviewCount} open review(s), ${input.quarantineCount} quarantined import row(s).`
          : 'Ledger publication healthy for this pack.',
      light: input.quarantineCount ? 'grey' : input.openReviewCount ? 'amber' : 'green',
    },
  ]

  return {
    title: 'Board pack',
    subtitle: `${input.organisationName} · ${input.budgetCode} · management accounts (not statutory)`,
    quarterLabel: `${input.review.quarter} ${input.review.financialYear} · v${input.review.version}`,
    locked,
    version: input.review.version,
    overallLight,
    sections,
    categoryRows: input.categoryRows,
    managementLines: input.managementLines,
    cashFlow: input.cashFlow,
    programmePosition: input.programmePosition,
  }
}
