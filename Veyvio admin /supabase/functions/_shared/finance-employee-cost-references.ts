/**
 * Validate employee cost-reference upsert payloads for finance-api.
 */

export type EmployeeCostReferenceInput = {
  id?: string
  externalPayrollId: string
  displayName: string
  orgNodeId?: string
  roleTitle?: string
  costCentre?: string
  employmentKind?: string
  wageCostBearing?: boolean
  expectedEmployerCostMinor?: number
  overtimeMinor?: number
  employerNiMinor?: number
  employerPensionMinor?: number
  allocationComplete?: boolean
  active?: boolean
}

export type ValidatedEmployeeCostReference = {
  id: string
  externalPayrollId: string
  displayName: string
  orgNodeId: string
  roleTitle: string
  costCentre: string
  employmentKind: string
  wageCostBearing: boolean
  expectedEmployerCostMinor: number
  overtimeMinor: number
  employerNiMinor: number
  employerPensionMinor: number
  allocationComplete: boolean
  active: boolean
}

const EMPLOYMENT_KINDS = new Set([
  'board',
  'employed',
  'volunteer',
  'contractor',
  'agency',
])

function asNonNegInt(value: unknown, field: string): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${field}_must_be_non_negative_integer`)
  }
  return n
}

export function parseEmployeeCostReferenceInputs(raw: unknown): ValidatedEmployeeCostReference[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('employees_required')
  }
  if (raw.length > 2000) {
    throw new Error('employees_too_many')
  }

  const seen = new Set<string>()
  const out: ValidatedEmployeeCostReference[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') throw new Error('employee_invalid')
    const row = item as Record<string, unknown>
    const externalPayrollId = String(row.externalPayrollId ?? row.external_payroll_id ?? '').trim()
    const displayName = String(row.displayName ?? row.display_name ?? '').trim()
    if (!externalPayrollId) throw new Error('external_payroll_id_required')
    if (!displayName) throw new Error('display_name_required')

    const key = externalPayrollId.toUpperCase()
    if (seen.has(key)) throw new Error('duplicate_external_payroll_id')
    seen.add(key)

    const employmentKind = String(row.employmentKind ?? row.employment_kind ?? 'employed')
      .trim()
      .toLowerCase()
    if (!EMPLOYMENT_KINDS.has(employmentKind)) throw new Error('employment_kind_invalid')

    const id =
      String(row.id ?? '').trim() ||
      `ecr_${externalPayrollId.toLowerCase().replace(/[^a-z0-9_-]+/g, '_')}`

    out.push({
      id,
      externalPayrollId,
      displayName,
      orgNodeId: String(row.orgNodeId ?? row.org_node_id ?? '').trim(),
      roleTitle: String(row.roleTitle ?? row.role_title ?? '').trim(),
      costCentre: String(row.costCentre ?? row.cost_centre ?? '').trim(),
      employmentKind,
      wageCostBearing: Boolean(row.wageCostBearing ?? row.wage_cost_bearing ?? true),
      expectedEmployerCostMinor: asNonNegInt(
        row.expectedEmployerCostMinor ?? row.expected_employer_cost_minor,
        'expected_employer_cost_minor',
      ),
      overtimeMinor: asNonNegInt(row.overtimeMinor ?? row.overtime_minor, 'overtime_minor'),
      employerNiMinor: asNonNegInt(
        row.employerNiMinor ?? row.employer_ni_minor,
        'employer_ni_minor',
      ),
      employerPensionMinor: asNonNegInt(
        row.employerPensionMinor ?? row.employer_pension_minor,
        'employer_pension_minor',
      ),
      allocationComplete: Boolean(
        row.allocationComplete ?? row.allocation_complete ?? true,
      ),
      active: Boolean(row.active ?? true),
    })
  }

  return out
}
