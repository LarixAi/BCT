export type AnnualBudgetLine = {
  code: string
  label: string
  category: string
  amountMinor: number
  costCentreId: string | null
}

export type AnnualBudgetProposal = {
  financialYear: string
  title: string
  budgetCode: string
  financeBudgetReference: string
  currency: string
  totalIncomeMinor: number
  contingencyMinor: number
  lineItems: AnnualBudgetLine[]
  totalExpenditureMinor: number
}

export class AnnualBudgetValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
  }
}

const YEAR_PATTERN = /^(\d{4})\/(\d{2})$/
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,39}$/
const CURRENCY_PATTERN = /^[A-Z]{3}$/

function text(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): string {
  const result = String(value ?? '').trim()
  if (result.length < minimum || result.length > maximum) {
    throw new AnnualBudgetValidationError(
      `${label} must be between ${minimum} and ${maximum} characters`,
      'invalid_annual_budget',
    )
  }
  return result
}

function moneyMinor(value: unknown, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new AnnualBudgetValidationError(
      `${label} must be a non-negative whole amount in minor currency units`,
      'invalid_annual_budget_amount',
    )
  }
  return value
}

export function validateAnnualBudgetProposal(
  input: Record<string, unknown>,
): AnnualBudgetProposal {
  const financialYear = String(input.financialYear ?? '').trim()
  const yearMatch = YEAR_PATTERN.exec(financialYear)
  if (!yearMatch) {
    throw new AnnualBudgetValidationError(
      'Financial year must use the format 2026/27',
      'invalid_financial_year',
    )
  }
  const startYear = Number(yearMatch[1])
  const expectedSuffix = String((startYear + 1) % 100).padStart(2, '0')
  if (yearMatch[2] !== expectedSuffix) {
    throw new AnnualBudgetValidationError(
      'Financial year must contain consecutive years',
      'invalid_financial_year',
    )
  }

  const title = text(input.title, 'Budget title', 3, 160)
  const budgetCode = text(input.budgetCode, 'Budget code', 2, 40)
  if (!CODE_PATTERN.test(budgetCode)) {
    throw new AnnualBudgetValidationError(
      'Budget code contains unsupported characters',
      'invalid_budget_code',
    )
  }
  const financeBudgetReference = text(
    input.financeBudgetReference,
    'Finance budget reference',
    3,
    200,
  )
  const currency = String(input.currency ?? 'GBP').trim().toUpperCase()
  if (!CURRENCY_PATTERN.test(currency)) {
    throw new AnnualBudgetValidationError(
      'Currency must be a three-letter code',
      'invalid_annual_budget_currency',
    )
  }
  const totalIncomeMinor = moneyMinor(
    input.totalIncomeMinor,
    'Total income',
  )
  const contingencyMinor = moneyMinor(
    input.contingencyMinor ?? 0,
    'Contingency',
  )

  if (!Array.isArray(input.lineItems) || input.lineItems.length < 1) {
    throw new AnnualBudgetValidationError(
      'At least one expenditure line is required',
      'annual_budget_lines_required',
    )
  }
  if (input.lineItems.length > 200) {
    throw new AnnualBudgetValidationError(
      'No more than 200 expenditure lines are permitted',
      'annual_budget_too_large',
    )
  }

  const lineItems = input.lineItems.map((value, index): AnnualBudgetLine => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new AnnualBudgetValidationError(
        `Budget line ${index + 1} is invalid`,
        'invalid_annual_budget_line',
      )
    }
    const row = value as Record<string, unknown>
    const code = text(row.code, `Budget line ${index + 1} code`, 1, 40)
    if (!CODE_PATTERN.test(code)) {
      throw new AnnualBudgetValidationError(
        `Budget line ${index + 1} code contains unsupported characters`,
        'invalid_annual_budget_line',
      )
    }
    return {
      code,
      label: text(row.label, `Budget line ${index + 1} label`, 2, 120),
      category: text(
        row.category ?? 'other',
        `Budget line ${index + 1} category`,
        2,
        80,
      ),
      amountMinor: moneyMinor(
        row.amountMinor,
        `Budget line ${index + 1} amount`,
      ),
      costCentreId: row.costCentreId
        ? text(row.costCentreId, `Budget line ${index + 1} cost centre`, 1, 120)
        : null,
    }
  })

  const codes = lineItems.map((line) => line.code.toLowerCase())
  if (new Set(codes).size !== codes.length) {
    throw new AnnualBudgetValidationError(
      'Budget line codes must be unique',
      'duplicate_annual_budget_line',
    )
  }
  const lineTotal = lineItems.reduce((sum, line) => {
    const next = sum + line.amountMinor
    if (!Number.isSafeInteger(next)) {
      throw new AnnualBudgetValidationError(
        'Annual budget total is too large',
        'annual_budget_too_large',
      )
    }
    return next
  }, 0)
  const totalExpenditureMinor = lineTotal + contingencyMinor
  if (!Number.isSafeInteger(totalExpenditureMinor)) {
    throw new AnnualBudgetValidationError(
      'Annual budget total is too large',
      'annual_budget_too_large',
    )
  }

  return {
    financialYear,
    title,
    budgetCode,
    financeBudgetReference,
    currency,
    totalIncomeMinor,
    contingencyMinor,
    lineItems,
    totalExpenditureMinor,
  }
}
