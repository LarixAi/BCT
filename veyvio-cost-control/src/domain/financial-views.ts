/**
 * Four financial views — accountant starting point is ledger + bank reconciliation.
 * Budget / forecast / cash flow / P&L are derived views, never co-authoritative write paths.
 */

export type FinancialViewId = 'budget' | 'forecast' | 'cash_flow' | 'profit_and_loss'

export type FinancialViewDef = {
  id: FinancialViewId
  label: string
  question: string
  basis: string
  route: string
  /** Cost-only boundary note shown on the page. */
  boundaryNote: string
}

export const FINANCIAL_VIEWS: readonly FinancialViewDef[] = [
  {
    id: 'budget',
    label: 'Budget',
    question: 'What were we authorised to spend?',
    basis: 'Approved plan (immutable original + tracked revisions)',
    route: '/budgets',
    boundaryNote: 'Authorisation view only — does not replace the cost ledger.',
  },
  {
    id: 'forecast',
    label: 'Forecast',
    question: 'What do we now expect to spend or earn?',
    basis: 'Actuals plus commitments and estimates',
    route: '/forecast',
    boundaryNote: 'Never presents forecast as actual spend.',
  },
  {
    id: 'cash_flow',
    label: 'Cash flow',
    question: 'Will enough money be in the bank when payments fall due?',
    basis: 'Expected receipt and payment dates + bank feed',
    route: '/cash-flow',
    boundaryNote: 'Liquidity view — profit does not equal cash.',
  },
  {
    id: 'profit_and_loss',
    label: 'Management accounts',
    question: 'Did the organisation generate a surplus or deficit?',
    basis: 'Imported income summary + cost ledger (not statutory accounts)',
    route: '/management-accounts',
    boundaryNote:
      'Management income & expenditure only. Detailed invoicing stays in the accounting system.',
  },
] as const

/** Authoritative equation labels — match Blueprint §5 / accountant wording. */
export const BUDGET_EQUATION_LABELS = {
  availableNow: {
    label: 'Available now',
    formula: 'Approved budget − Actual costs − Commitments',
  },
  projectedFinal: {
    label: 'Projected final cost',
    formula: 'Actual costs + Commitments + Remaining forecast',
  },
  projectedRemaining: {
    label: 'Projected remaining',
    formula: 'Approved budget − Projected final cost',
  },
  varianceToApproved: {
    label: 'Projected variance',
    formula: 'Approved budget − Projected final cost',
  },
} as const
