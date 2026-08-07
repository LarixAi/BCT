/** Canonical Cost Control domain types — Blueprint §5, §6, §11. */

export type OrganisationId = string
export type CostId = string
export type BudgetId = string
export type CostVersion = number

/** ISO 4217 — authoritative amounts never use binary floats. */
export type CurrencyCode = 'GBP'

export type CostLifecycleStatus = 'actual' | 'committed' | 'forecast' | 'estimated'

export type CostCategory =
  | 'fuel'
  | 'vehicle_ownership'
  | 'maintenance'
  | 'wages'
  | 'premises'
  | 'technology'
  | 'professional'
  | 'administration'
  | 'exceptional'

/** Depth under a category — Blueprint §6 / §7 vehicle + operating cost profile. */
export type CostSubcategory =
  | 'lease'
  | 'finance'
  | 'interest'
  | 'insurance'
  | 'tax'
  | 'depreciation'
  | 'disposal'
  | 'purchase'
  | 'fuel_card'
  | 'cash_fuel'
  | 'ev_charging'
  | 'adblue'
  | 'fees'
  | 'mot'
  | 'service'
  | 'repair'
  | 'inspection'
  | 'tyres'
  | 'parts'
  | 'labour'
  | 'recovery'
  | 'hire_vehicle'
  | 'general'
  /** Operating overhead depth — Blueprint §6 Premises / Technology / Professional / Admin. */
  | 'rent'
  | 'rates'
  | 'utilities'
  | 'cleaning'
  | 'security'
  | 'software'
  | 'licence'
  | 'equipment'
  | 'telecoms'
  | 'accountancy'
  | 'legal'
  | 'consulting'
  | 'office_supplies'
  | 'training'
  | 'uniforms'
  | 'banking_fees'
  | 'subscription'
  | 'contract'
  | 'overhead'

/** Approval workflow on a ledger row — distinct from lifecycle actual/committed/forecast. */
export type ApprovalStatus = 'draft' | 'under_review' | 'approved' | 'disputed'

export type VatTreatment = 'standard' | 'zero_rated' | 'exempt' | 'out_of_scope'

export type ValidationState = 'pending' | 'validated' | 'quarantined' | 'reconciled'

export type ReviewState = 'none' | 'open' | 'approved' | 'rejected' | 'snoozed'

export type Money = {
  /** Integer minor units (pence for GBP). */
  amountMinor: number
  currency: CurrencyCode
}

export type CostAllocation = {
  budgetId: BudgetId
  category: CostCategory
  costCentreId?: string | null
  vehicleId?: string | null
  supplierId?: string | null
  amountMinor: number
}

export type CostEvidence = {
  id: string
  label: string
  sourceType: 'csv' | 'manual' | 'xero' | 'fuel_card' | 'bank' | 'payroll_summary'
  checksum?: string
}

export type CostRecord = {
  id: CostId
  organisationId: OrganisationId
  version: CostVersion
  supplierName: string
  description: string
  reference: string
  transactionDate: string
  /** When cash left / will leave the bank — may differ from transactionDate. */
  paymentDate?: string | null
  accountingPeriod: string
  net: Money
  vat: Money
  gross: Money
  /** Explicit VAT treatment when zero VAT is not enough (exempt vs zero-rated). */
  vatTreatment?: VatTreatment | null
  status: CostLifecycleStatus
  category: CostCategory
  /** Optional — required for ownership/fuel/maintenance depth on vehicle profiles. */
  subcategory?: CostSubcategory | null
  allocations: CostAllocation[]
  validationState: ValidationState
  reviewState: ReviewState
  evidence: CostEvidence[]
  sourceKey: string
  linkedCommitmentId?: CostId | null
  createdAt: string
  updatedAt: string
  correctionReason?: string | null
}

export type BudgetLine = {
  id: string
  category: CostCategory
  label: string
  /** Current revised approved amount (original + tracked changes). */
  approvedMinor: number
  /** Immutable original approved baseline for this line. */
  originalApprovedMinor: number
  ownerName: string
  ownerRole: string
}

export type Budget = {
  id: BudgetId
  organisationId: OrganisationId
  name: string
  /** CEC or other programme code — structure open until §20 confirmed. */
  code: string
  financialYear: string
  version: number
  currency: CurrencyCode
  lines: BudgetLine[]
  contingencyMinor: number
}

export type ForecastAssumption = {
  id: string
  label: string
  amountMinor: number
  category: CostCategory
  owner: string
  expiresAt: string
}

export type FinancialSnapshot = {
  id: string
  organisationId: OrganisationId
  calculationId: string
  formulaVersion: string
  createdAt: string
  budgetId: BudgetId
  budgetVersion: number
  approvedMinor: number
  actualMinor: number
  committedMinor: number
  forecastMinor: number
  availableMinor: number
  projectedRemainingMinor: number
  projectedFinalMinor: number
  varianceToApprovedMinor: number
}

export type ReviewItem = {
  id: string
  organisationId: OrganisationId
  costId: CostId
  signal:
    | 'probable_duplicate'
    | 'missing_evidence'
    | 'allocation_issue'
    | 'fuel_anomaly'
    | 'unsupported'
    | 'projected_overspend'
    | 'overtime_rising'
    | 'wage_variance'
  title: string
  detail: string
  state: Exclude<ReviewState, 'none'>
  createdAt: string
  resolutionNote?: string | null
  resolvedAt?: string | null
  resolvedBy?: string | null
}

export type QuarantineItem = {
  id: string
  organisationId: OrganisationId
  sourceKey: string
  reason: string
  raw: Record<string, string>
  createdAt: string
}

export type ImportRun = {
  id: string
  organisationId: OrganisationId
  fileName: string
  startedAt: string
  finishedAt: string
  rowsRead: number
  accepted: number
  quarantined: number
  duplicatesSkipped: number
}

export type Organisation = {
  id: OrganisationId
  name: string
  tradingName: string
  currency: CurrencyCode
  timezone: string
}
