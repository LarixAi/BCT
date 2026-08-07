import type {
  ApprovalStatus,
  CostCategory,
  CostLifecycleStatus,
  CostSubcategory,
  ValidationState,
  VatTreatment,
} from '../domain/types'
import type { OperatingGroupId } from '../domain/operating-costs'

const CATEGORY_LABELS: Record<CostCategory, string> = {
  fuel: 'Fuel',
  vehicle_ownership: 'Vehicle ownership',
  maintenance: 'Maintenance',
  wages: 'Wages',
  premises: 'Premises',
  technology: 'Technology',
  professional: 'Professional',
  administration: 'Administration',
  exceptional: 'Exceptional',
}

const STATUS_LABELS: Record<CostLifecycleStatus, string> = {
  actual: 'Actual',
  committed: 'Committed',
  forecast: 'Forecast',
  estimated: 'Estimated',
}

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  draft: 'Draft',
  under_review: 'Under review',
  approved: 'Approved',
  disputed: 'Disputed',
}

const VAT_LABELS: Record<VatTreatment, string> = {
  standard: 'Standard rated',
  zero_rated: 'Zero-rated',
  exempt: 'Exempt',
  out_of_scope: 'Out of scope',
}

const SUBCATEGORY_LABELS: Partial<Record<CostSubcategory, string>> = {
  rent: 'Rent',
  rates: 'Rates',
  utilities: 'Utilities',
  cleaning: 'Cleaning',
  security: 'Security',
  software: 'Software',
  licence: 'Licence',
  equipment: 'Equipment',
  telecoms: 'Telecoms',
  insurance: 'Insurance',
  accountancy: 'Accountancy',
  legal: 'Legal',
  consulting: 'Consulting',
  fees: 'Fees',
  office_supplies: 'Office supplies',
  training: 'Training',
  uniforms: 'Uniforms',
  banking_fees: 'Banking fees',
  subscription: 'Subscription',
  contract: 'Contract',
  overhead: 'Overhead',
  general: 'General',
}

const COST_CENTRE_LABELS: Record<string, string> = {
  cc_ops: 'Operations',
  cc_yard: 'Yard',
  cc_drv: 'Drivers',
  cc_fin: 'Finance',
  cc_exec: 'Executive',
  cc_ppl: 'People & safety',
  unassigned: 'Unassigned',
}

const OPERATING_GROUP_LABELS: Record<OperatingGroupId, string> = {
  premises: 'Premises',
  technology: 'Technology',
  insurance_professional: 'Insurance & professional',
  office_admin: 'Office & administration',
  training_staff: 'Training & staff',
  recurring: 'Recurring contracts',
  other: 'Other overheads',
}

export function categoryLabel(c: CostCategory): string {
  return CATEGORY_LABELS[c]
}

export function statusLabel(s: CostLifecycleStatus): string {
  return STATUS_LABELS[s]
}

export function approvalLabel(s: ApprovalStatus): string {
  return APPROVAL_LABELS[s]
}

export function vatTreatmentLabel(s: VatTreatment): string {
  return VAT_LABELS[s]
}

export function subcategoryLabel(s: CostSubcategory | null | undefined): string {
  if (!s) return '—'
  return SUBCATEGORY_LABELS[s] ?? s
}

export function costCentreLabel(id: string | null | undefined): string {
  if (!id) return COST_CENTRE_LABELS.unassigned
  return COST_CENTRE_LABELS[id] ?? id
}

export function operatingGroupLabel(id: OperatingGroupId): string {
  return OPERATING_GROUP_LABELS[id]
}

export function validationLabel(s: ValidationState): string {
  if (s === 'reconciled') return 'Reconciled'
  if (s === 'validated') return 'Validated'
  if (s === 'quarantined') return 'Quarantined'
  return 'Pending'
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatPeriod(period: string): string {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }
  return period
}
