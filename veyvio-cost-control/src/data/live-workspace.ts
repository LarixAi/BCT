import { buildFinancialSnapshot } from '../domain/snapshot'
import { emptyBankConnection } from '../integrations/bank'
import { emptySageConnection, type SageIntegrationSnapshot } from '../integrations/sage'
import { DEFAULT_APPROVAL_BANDS } from '../domain/clg-governance'
import type { Organisation } from '../domain/types'
import type { CostControlStore } from './seed'

/**
 * Empty finance workspace for a live Command company.
 * Used until the Finance API / Postgres workspace is provisioned —
 * never reuse Demo CEC seed against another organisation_id.
 */
export function createLiveOrganisationWorkspace(input: {
  organisationId: string
  organisationName: string
}): CostControlStore {
  const now = new Date().toISOString()
  const year = new Date().getUTCFullYear()
  const organisation: Organisation = {
    id: input.organisationId,
    name: input.organisationName,
    tradingName: input.organisationName,
    currency: 'GBP',
    timezone: 'Europe/London',
  }
  const budget = {
    id: `bud_${input.organisationId}_current`,
    organisationId: input.organisationId,
    name: 'Company cost budget',
    code: 'PENDING',
    financialYear: `${year}/${String(year + 1).slice(-2)}`,
    version: 1,
    currency: 'GBP' as const,
    lines: [],
    contingencyMinor: 0,
  }
  const snap = buildFinancialSnapshot({
    organisationId: input.organisationId,
    budget,
    costs: [],
    nowIso: now,
  })
  const sageIntegration: SageIntegrationSnapshot = {
    connection: emptySageConnection(input.organisationId),
    mappings: [],
    unmappedCount: 0,
    failedExports: [],
    recentPostings: [],
  }

  return {
    organisation,
    budget,
    budgetChanges: [],
    quarterlyReview: {
      id: `qr_${input.organisationId}_open`,
      organisationId: input.organisationId,
      budgetId: budget.id,
      financialYear: budget.financialYear,
      quarter: 'Q1',
      status: 'open',
      periodStart: `${year}-04-01`,
      periodEnd: `${year}-06-30`,
      version: 1,
      priorForecastByLineId: {},
      lineReviews: [],
      ownerConfirmedAt: null,
      financeApprovedAt: null,
      financeApprovedBy: null,
      lockedAt: null,
      lockedBy: null,
      movementSinceLastReviewMinor: 0,
      lastReviewLabel: 'No prior review',
    },
    incomeSummary: null,
    clgProfile: {
      organisationId: input.organisationId,
      legalForm: 'clg',
      companyNumber: '',
      guaranteeAmountMinor: 0,
      charityStatus: 'pending_decision',
      charityNumber: null,
      articlesRequireAudit: false,
      funderRequiresAuditedAccounts: false,
      turnoverMinor: 0,
      totalAssetsMinor: 0,
      averageEmployees: 0,
    },
    clgPersons: [],
    approvalBands: DEFAULT_APPROVAL_BANDS,
    fundingAwards: [],
    costs: [],
    reviews: [],
    quarantine: [],
    imports: [],
    payPeriods: [],
    orgNodes: [],
    employeeCostReferences: [],
    driverDays: [],
    payRates: [],
    wageBatches: [],
    bankAccounts: [],
    bankTransactions: [],
    bankConnection: emptyBankConnection(input.organisationId),
    pendingBankConsentState: null,
    bankRestrictedMinor: 0,
    sageIntegration,
    auditEvents: [],
    lastSnapshot: snap,
    lastValidSnapshot: snap,
  }
}

export function isDemoOrganisationId(organisationId: string): boolean {
  return organisationId === 'org_demo_cec'
}
