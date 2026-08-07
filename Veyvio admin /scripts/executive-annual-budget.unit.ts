import assert from 'node:assert/strict'
import {
  AnnualBudgetValidationError,
  validateAnnualBudgetProposal,
} from '../supabase/functions/_shared/executive-annual-budget-policy.ts'

const valid = {
  financialYear: '2026/27',
  title: 'Veyvio annual operating budget',
  budgetCode: 'CEC-FY27',
  financeBudgetReference: 'finance://budgets/cec-fy27/v1',
  currency: 'gbp',
  totalIncomeMinor: 1_250_000_00,
  contingencyMinor: 25_000_00,
  lineItems: [
    {
      code: 'WAGES',
      label: 'Wages and employer costs',
      category: 'wages',
      amountMinor: 410_000_00,
    },
    {
      code: 'FLEET',
      label: 'Fleet and fuel',
      category: 'fleet',
      amountMinor: 315_000_00,
      costCentreId: 'central-fleet',
    },
  ],
}

const parsed = validateAnnualBudgetProposal(valid)
assert.equal(parsed.currency, 'GBP')
assert.equal(parsed.lineItems.length, 2)
assert.equal(parsed.lineItems[0]?.costCentreId, null)
assert.equal(parsed.totalExpenditureMinor, 750_000_00)

for (const [label, input, code] of [
  [
    'non-consecutive financial year',
    { ...valid, financialYear: '2026/29' },
    'invalid_financial_year',
  ],
  [
    'negative line',
    {
      ...valid,
      lineItems: [{ ...valid.lineItems[0], amountMinor: -1 }],
    },
    'invalid_annual_budget_amount',
  ],
  [
    'fractional minor units',
    {
      ...valid,
      lineItems: [{ ...valid.lineItems[0], amountMinor: 12.5 }],
    },
    'invalid_annual_budget_amount',
  ],
  [
    'duplicate line code',
    {
      ...valid,
      lineItems: [
        valid.lineItems[0],
        { ...valid.lineItems[0], code: 'wages' },
      ],
    },
    'duplicate_annual_budget_line',
  ],
  [
    'missing lines',
    { ...valid, lineItems: [] },
    'annual_budget_lines_required',
  ],
] as const) {
  assert.throws(
    () => validateAnnualBudgetProposal(input as Record<string, unknown>),
    (error) =>
      error instanceof AnnualBudgetValidationError &&
      error.code === code,
    label,
  )
}

console.log('Executive annual-budget validation tests passed')
