import type {
  ApprovalBand,
  ClgPerson,
  ClgProfile,
  FundingAward,
} from '../domain/clg-governance'
import { DEFAULT_APPROVAL_BANDS } from '../domain/clg-governance'
import type { OrganisationId } from '../domain/types'

export function createDemoClgGovernance(organisationId: OrganisationId): {
  clgProfile: ClgProfile
  clgPersons: ClgPerson[]
  approvalBands: ApprovalBand[]
  fundingAwards: FundingAward[]
} {
  const clgProfile: ClgProfile = {
    organisationId,
    legalForm: 'clg',
    companyNumber: '12345678',
    guaranteeAmountMinor: 1_00,
    charityStatus: 'pending_decision',
    charityNumber: null,
    articlesRequireAudit: false,
    funderRequiresAuditedAccounts: true,
    turnoverMinor: 1_250_000_00,
    totalAssetsMinor: 420_000_00,
    averageEmployees: 28,
  }

  const clgPersons: ClgPerson[] = [
    {
      id: 'clg_chair',
      organisationId,
      displayName: 'Alex Morgan',
      roles: ['director', 'guarantor_member'],
      declaredInterests: 'None material',
      relatedSupplierNames: [],
      remunerationMinor: 0,
      expensesYtdMinor: 180_00,
      loansToOrFromMinor: 0,
      active: true,
    },
    {
      id: 'clg_fd',
      organisationId,
      displayName: 'Chris Patel',
      roles: ['director', 'guarantor_member'],
      declaredInterests: 'Finance Director / Treasurer',
      relatedSupplierNames: [],
      remunerationMinor: 0,
      expensesYtdMinor: 95_00,
      loansToOrFromMinor: 0,
      active: true,
    },
    {
      id: 'clg_indep',
      organisationId,
      displayName: 'Jordan Lee',
      roles: ['director', 'guarantor_member'],
      declaredInterests: 'Independent director — safeguarding',
      relatedSupplierNames: [],
      remunerationMinor: 0,
      expensesYtdMinor: 40_00,
      loansToOrFromMinor: 0,
      active: true,
    },
    {
      id: 'clg_member',
      organisationId,
      displayName: 'Community Transport Members Assoc.',
      roles: ['guarantor_member'],
      declaredInterests: 'Membership body',
      relatedSupplierNames: [],
      remunerationMinor: 0,
      expensesYtdMinor: 0,
      loansToOrFromMinor: 0,
      active: true,
    },
    {
      id: 'clg_related_supplier',
      organisationId,
      displayName: 'Hart & Partners',
      roles: ['related_supplier', 'connected_person'],
      declaredInterests: 'Firm provides bookkeeping; partner is connected to a board advisor',
      relatedSupplierNames: ['Hart & Partners'],
      remunerationMinor: 0,
      expensesYtdMinor: 0,
      loansToOrFromMinor: 0,
      active: true,
    },
  ]

  const fundingAwards: FundingAward[] = [
    {
      id: 'fund_cec',
      organisationId,
      funderName: 'Local authority CEC programme',
      purpose: 'Community transport passenger journeys under CEC schedule',
      periodStart: '2026-04-01',
      periodEnd: '2027-03-31',
      eligibleRules:
        'Eligible: driver wages, fuel, maintenance, vehicle operating costs directly attributable to CEC routes. Ineligible: unrelated commercial hire.',
      awardedMinor: 980_000_00,
      receivedMinor: 490_000_00,
      spentMinor: 312_000_00,
      committedMinor: 48_000_00,
      requiredOutputs: 'On-time passenger journeys; safeguarding compliance; quarterly finance report',
      reportingRequirements: 'Quarterly budget-versus-actual + grant expenditure statement',
    },
  ]

  return {
    clgProfile,
    clgPersons,
    approvalBands: DEFAULT_APPROVAL_BANDS,
    fundingAwards,
  }
}
