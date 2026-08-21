/**
 * CLG governance & audit-evidence foundation.
 * Veyvio = cost control + continuous/quarterly/annual assurance evidence.
 * Statutory accounts stay in accounting software; accountant/auditor receives a locked pack.
 */

import type { CostRecord, OrganisationId } from './types'
import { requireOrganisationId } from './tenancy'

/** Legal form — approved: ordinary Company Limited by Guarantee (not CIC by default). */
export type LegalForm = 'clg' | 'cic' | 'charitable_clg' | 'other'

export type CharityRegistrationStatus = 'not_registered' | 'registered' | 'pending_decision'

export type ClgProfile = {
  organisationId: OrganisationId
  legalForm: LegalForm
  companyNumber: string
  guaranteeAmountMinor: number
  /** OPEN until the operator confirms Charity Commission registration. */
  charityStatus: CharityRegistrationStatus
  charityNumber: string | null
  articlesRequireAudit: boolean
  funderRequiresAuditedAccounts: boolean
  /** FY beginning on/after 6 Apr 2025 private company audit-exemption thresholds (guidance). */
  turnoverMinor: number
  totalAssetsMinor: number
  averageEmployees: number
}

export type PersonRole =
  | 'director'
  | 'guarantor_member'
  | 'connected_person'
  | 'related_supplier'

export type ClgPerson = {
  id: string
  organisationId: OrganisationId
  displayName: string
  roles: PersonRole[]
  declaredInterests: string
  relatedSupplierNames: string[]
  remunerationMinor: number
  expensesYtdMinor: number
  loansToOrFromMinor: number
  active: boolean
}

export type ApprovalBand = {
  id: string
  label: string
  minInclusiveMinor: number
  /** null = no upper bound */
  maxInclusiveMinor: number | null
  requiredApprovers: string
  relatedPartyOverride: boolean
  unbudgetedRequiresBoard: boolean
}

export type FundingAward = {
  id: string
  organisationId: OrganisationId
  funderName: string
  purpose: string
  periodStart: string
  periodEnd: string
  eligibleRules: string
  awardedMinor: number
  receivedMinor: number
  spentMinor: number
  committedMinor: number
  requiredOutputs: string
  reportingRequirements: string
}

export type AuditAssuranceLevel = 'continuous' | 'quarterly' | 'annual_external'

export type EvidencePackItem = {
  id: string
  title: string
  level: AuditAssuranceLevel
  status: 'ready' | 'partial' | 'missing'
  detail: string
  href?: string
}

/** Companies House private-company audit exemption (FY beginning on/after 6 Apr 2025): meet ≥2 of 3. */
export function qualifiesForAuditExemption(profile: ClgProfile): {
  qualifies: boolean
  met: { turnover: boolean; assets: boolean; employees: boolean }
  stillRequiredReasons: string[]
} {
  const met = {
    turnover: profile.turnoverMinor <= 15_000_000_00,
    assets: profile.totalAssetsMinor <= 7_500_000_00,
    employees: profile.averageEmployees <= 50,
  }
  const count = Number(met.turnover) + Number(met.assets) + Number(met.employees)
  const stillRequiredReasons: string[] = []
  if (profile.articlesRequireAudit) stillRequiredReasons.push('Articles require an audit')
  if (profile.funderRequiresAuditedAccounts) {
    stillRequiredReasons.push('Funder or grant agreement requires audited accounts')
  }
  if (profile.charityStatus === 'registered') {
    stillRequiredReasons.push(
      'Registered charity — Charity Commission independent examination / audit rules may apply',
    )
  }
  const qualifies = count >= 2 && stillRequiredReasons.length === 0
  return { qualifies, met, stillRequiredReasons }
}

export function resolveApprovalBand(
  bands: ApprovalBand[],
  amountMinor: number,
  opts: { relatedParty: boolean; unbudgeted: boolean },
): ApprovalBand {
  if (opts.relatedParty) {
    const rp = bands.find((b) => b.relatedPartyOverride)
    if (rp) return rp
  }
  if (opts.unbudgeted) {
    const board = [...bands].reverse().find((b) => b.unbudgetedRequiresBoard)
    if (board) return board
  }
  const match = bands.find((b) => {
    const above = amountMinor >= b.minInclusiveMinor
    const below = b.maxInclusiveMinor == null || amountMinor <= b.maxInclusiveMinor
    return above && below && !b.relatedPartyOverride
  })
  return match ?? bands[bands.length - 1]!
}

export function isRelatedPartySupplier(
  persons: ClgPerson[],
  supplierName: string,
): { related: boolean; persons: ClgPerson[] } {
  const needle = supplierName.trim().toLowerCase()
  const hit = persons.filter(
    (p) =>
      p.active &&
      (p.roles.includes('related_supplier') ||
        p.relatedSupplierNames.some((n) => n.trim().toLowerCase() === needle) ||
        p.displayName.trim().toLowerCase() === needle),
  )
  return { related: hit.length > 0, persons: hit }
}

export type TraceabilityGap = {
  costId: string
  field: string
  detail: string
}

/** Auditor chain gaps for a cost — continuous internal control checklist. */
export function findTraceabilityGaps(cost: CostRecord): TraceabilityGap[] {
  const gaps: TraceabilityGap[] = []
  if (!cost.supplierName.trim()) {
    gaps.push({ costId: cost.id, field: 'supplier', detail: 'Supplier missing' })
  }
  if (!cost.description.trim()) {
    gaps.push({ costId: cost.id, field: 'description', detail: 'Purchase description missing' })
  }
  if (!cost.allocations.length) {
    gaps.push({ costId: cost.id, field: 'budget', detail: 'No budget allocation' })
  }
  if (!cost.evidence.length && cost.status === 'actual') {
    gaps.push({ costId: cost.id, field: 'evidence', detail: 'Invoice / receipt / contract missing' })
  }
  if (cost.reviewState === 'open') {
    gaps.push({ costId: cost.id, field: 'approval', detail: 'Still under review' })
  }
  if (cost.reviewState === 'rejected') {
    gaps.push({ costId: cost.id, field: 'approval', detail: 'Disputed / rejected' })
  }
  return gaps
}

export function fundingUnspentMinor(award: FundingAward): number {
  return award.awardedMinor - award.spentMinor - award.committedMinor
}

export function buildAnnualEvidencePack(input: {
  organisationId: OrganisationId
  costs: CostRecord[]
  openReviews: number
  quarantineCount: number
  quarterlyLocked: boolean
  incomeApproved: boolean
  relatedPartyCostCount: number
  missingEvidenceCount: number
}): EvidencePackItem[] {
  requireOrganisationId(input.organisationId)
  const readyIf = (ok: boolean): EvidencePackItem['status'] => (ok ? 'ready' : 'missing')
  const partialIf = (ok: boolean, partial: boolean): EvidencePackItem['status'] =>
    ok ? 'ready' : partial ? 'partial' : 'missing'

  return [
    {
      id: 'tb',
      title: 'Trial balance / cost ledger extract',
      level: 'annual_external',
      status: readyIf(input.costs.length > 0),
      detail: `${input.costs.length} ledger rows available for export to the accountant.`,
      href: '/costs',
    },
    {
      id: 'gl',
      title: 'General ledger (cost postings)',
      level: 'annual_external',
      status: 'ready',
      detail: 'Canonical cost ledger with source keys — not a statutory GL substitute.',
      href: '/costs',
    },
    {
      id: 'ie',
      title: 'Management income & expenditure',
      level: 'annual_external',
      status: readyIf(input.incomeApproved),
      detail: input.incomeApproved
        ? 'Income summary accountant-approved.'
        : 'Income summary missing or unapproved.',
      href: '/management-accounts',
    },
    {
      id: 'bs',
      title: 'Balance sheet',
      level: 'annual_external',
      status: 'missing',
      detail: 'Prepared in accounting software — Veyvio does not own the balance sheet.',
    },
    {
      id: 'cf',
      title: 'Cash-flow report',
      level: 'annual_external',
      status: 'partial',
      detail: 'Payment-date cash view + bank feed; statutory cash-flow statement stays with accountant.',
      href: '/cash-flow',
    },
    {
      id: 'bva',
      title: 'Budget-versus-actual report',
      level: 'quarterly',
      status: 'ready',
      detail: 'CEC budget lines with variance narratives.',
      href: '/budgets',
    },
    {
      id: 'bank',
      title: 'Bank reconciliations',
      level: 'quarterly',
      status: 'partial',
      detail: 'Bank feed matching available; complete reconciling items with the accountant.',
      href: '/bank',
    },
    {
      id: 'suppliers',
      title: 'Supplier and purchase ledger',
      level: 'annual_external',
      status: 'ready',
      detail: 'Spend by supplier from the cost ledger.',
      href: '/suppliers',
    },
    {
      id: 'payroll',
      title: 'Payroll reconciliation',
      level: 'quarterly',
      status: 'partial',
      detail: 'Employer wage-cost import/reconcile — PAYE remains with the payroll provider.',
      href: '/wages',
    },
    {
      id: 'assets',
      title: 'Fixed-asset register',
      level: 'annual_external',
      status: 'partial',
      detail: 'Vehicle cost profiles support ownership costs; full FAR lives in accounting software.',
      href: '/vehicles',
    },
    {
      id: 'grants',
      title: 'Grant expenditure statements',
      level: 'annual_external',
      status: 'ready',
      detail: 'Funding awards with spent / committed / unspent balances.',
      href: '/governance',
    },
    {
      id: 'vat',
      title: 'VAT reconciliation',
      level: 'annual_external',
      status: 'partial',
      detail: 'Net / VAT / gross and VAT treatment on costs; VAT return stays with accountant.',
      href: '/operating',
    },
    {
      id: 'accruals',
      title: 'Accrual and prepayment schedules',
      level: 'quarterly',
      status: input.quarterlyLocked ? 'ready' : 'partial',
      detail: input.quarterlyLocked
        ? 'Quarterly snapshot locked for the period.'
        : 'Complete quarterly lock before treating accruals as final.',
      href: '/budgets/quarterly',
    },
    {
      id: 'related',
      title: 'Related-party report',
      level: 'annual_external',
      status: partialIf(input.relatedPartyCostCount === 0, input.relatedPartyCostCount > 0),
      detail:
        input.relatedPartyCostCount > 0
          ? `${input.relatedPartyCostCount} cost(s) flagged against the CLG register.`
          : 'No related-party costs flagged in the current ledger.',
      href: '/governance',
    },
    {
      id: 'journals',
      title: 'Manual-journal report',
      level: 'annual_external',
      status: 'missing',
      detail: 'Manual journals remain in accounting software; Veyvio exports corrections/audit events.',
      href: '/reviews',
    },
    {
      id: 'members',
      title: 'Member and director register',
      level: 'continuous',
      status: 'ready',
      detail: 'Directors, guarantor members, connected persons and related suppliers.',
      href: '/governance',
    },
    {
      id: 'access',
      title: 'User-access and approval report',
      level: 'annual_external',
      status: 'partial',
      detail: 'Approval bands and review decisions; full IAM report when auth is provisioned.',
      href: '/governance',
    },
    {
      id: 'audit_log',
      title: 'Complete transaction audit log',
      level: 'continuous',
      status: 'ready',
      detail: 'Immutable review/audit events on cost decisions.',
      href: '/reviews',
    },
    {
      id: 'exceptions',
      title: 'Missing-evidence and unresolved exceptions',
      level: 'continuous',
      status: partialIf(
        input.missingEvidenceCount === 0 && input.openReviews === 0 && input.quarantineCount === 0,
        true,
      ),
      detail: `${input.missingEvidenceCount} missing evidence · ${input.openReviews} open reviews · ${input.quarantineCount} quarantine.`,
      href: '/reviews',
    },
    {
      id: 'board',
      title: 'Board pack (locked quarter)',
      level: 'quarterly',
      status: input.quarterlyLocked ? 'ready' : 'partial',
      detail: 'Management board pack from quarterly snapshot.',
      href: '/board-pack',
    },
  ]
}

export const DEFAULT_APPROVAL_BANDS: ApprovalBand[] = [
  {
    id: 'band_500',
    label: 'Up to £500',
    minInclusiveMinor: 0,
    maxInclusiveMinor: 500_00,
    requiredApprovers: 'Budget owner',
    relatedPartyOverride: false,
    unbudgetedRequiresBoard: false,
  },
  {
    id: 'band_5k',
    label: '£500–£5,000',
    minInclusiveMinor: 500_01,
    maxInclusiveMinor: 5_000_00,
    requiredApprovers: 'Budget owner and finance',
    relatedPartyOverride: false,
    unbudgetedRequiresBoard: false,
  },
  {
    id: 'band_25k',
    label: '£5,000–£25,000',
    minInclusiveMinor: 5_000_01,
    maxInclusiveMinor: 25_000_00,
    requiredApprovers: 'Senior manager or director',
    relatedPartyOverride: false,
    unbudgetedRequiresBoard: false,
  },
  {
    id: 'band_board',
    label: 'Above £25,000',
    minInclusiveMinor: 25_000_01,
    maxInclusiveMinor: null,
    requiredApprovers: 'Board approval',
    relatedPartyOverride: false,
    unbudgetedRequiresBoard: true,
  },
  {
    id: 'band_related',
    label: 'Any related-party cost',
    minInclusiveMinor: 0,
    maxInclusiveMinor: null,
    requiredApprovers: 'Independent directors or board (interested person must not approve)',
    relatedPartyOverride: true,
    unbudgetedRequiresBoard: false,
  },
]
