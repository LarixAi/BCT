import type { OrganisationId } from './types'
import {
  computeProvisionalGross,
  type DriverDayRecord,
  type EffectivePayRate,
  type HoursValidationIssue,
  type ProvisionalGrossResult,
  validateDriverDays,
} from './driver-wage-hours'

/**
 * Wage-cost approval → lock → provider export → ledger post.
 * Corrections after lock create adjustment records — never silent overwrite.
 */

export type WageBatchLifecycle =
  | 'draft'
  | 'validated'
  | 'supervisor_review'
  | 'payroll_manager_approval'
  | 'locked'
  | 'exported_to_provider'
  | 'final_returned'
  | 'posted_to_ledger'
  | 'exception'

export const WAGE_BATCH_STAGE_LABELS: Record<WageBatchLifecycle, string> = {
  draft: 'Draft',
  validated: 'Validated',
  supervisor_review: 'Supervisor review',
  payroll_manager_approval: 'Payroll manager approval',
  locked: 'Locked',
  exported_to_provider: 'Sent to payroll provider',
  final_returned: 'Final payroll returned',
  posted_to_ledger: 'Posted to cost ledger',
  exception: 'Exception',
}

export type WagePersonPeriodSnapshot = {
  employeeCostReferenceId: string
  displayName: string
  externalPayrollId: string
  provisional: ProvisionalGrossResult
}

export type WageCostAdjustment = {
  id: string
  organisationId: OrganisationId
  wageBatchId: string
  employeeCostReferenceId: string
  /** ISO timestamp. */
  createdAt: string
  reason: string
  /** Signed minor delta to provisional gross (employer wage-cost input). */
  grossDeltaMinor: number
  createdByRole: 'payroll_manager' | 'finance'
  /** Points at the locked snapshot line being corrected — original remains. */
  replacesSnapshotNote: string
}

export type WageCostBatch = {
  id: string
  organisationId: OrganisationId
  payPeriodId: string
  label: string
  status: WageBatchLifecycle
  driverDayIds: string[]
  personSnapshots: WagePersonPeriodSnapshot[]
  validationIssues: HoursValidationIssue[]
  adjustments: WageCostAdjustment[]
  lockedAt: string | null
  exportedAt: string | null
  providerPackageRef: string | null
  finalReturnedAt: string | null
  postedToLedgerAt: string | null
  totalProvisionalGrossMinor: number
}

const FORWARD: Record<WageBatchLifecycle, WageBatchLifecycle | null> = {
  draft: 'validated',
  validated: 'supervisor_review',
  supervisor_review: 'payroll_manager_approval',
  payroll_manager_approval: 'locked',
  locked: 'exported_to_provider',
  exported_to_provider: 'final_returned',
  final_returned: 'posted_to_ledger',
  posted_to_ledger: null,
  exception: null,
}

export function canAdvanceWageBatch(status: WageBatchLifecycle): boolean {
  return FORWARD[status] !== null
}

export function buildWageCostBatch(input: {
  id: string
  organisationId: OrganisationId
  payPeriodId: string
  label: string
  days: DriverDayRecord[]
  rates: EffectivePayRate[]
  people: Array<{
    id: string
    displayName: string
    externalPayrollId: string
    approvedAllowanceMinor?: number
    holidayPayMinor?: number
    holidayPayMode?: 'leave_when_taken' | 'rolled_up_separate'
    rolledUpHolidayPayMinor?: number
  }>
}): WageCostBatch {
  const issues = validateDriverDays({ days: input.days, rates: input.rates })
  const critical = issues.some((i) => i.severity === 'critical')
  const personSnapshots: WagePersonPeriodSnapshot[] = []

  for (const person of input.people) {
    const personDays = input.days.filter((d) => d.employeeCostReferenceId === person.id)
    if (!personDays.length) continue
    const provisional = computeProvisionalGross({
      days: personDays,
      rates: input.rates,
      employeeCostReferenceId: person.id,
      approvedAllowanceMinor: person.approvedAllowanceMinor,
      holidayPayMinor: person.holidayPayMinor,
      holidayPayMode: person.holidayPayMode,
      rolledUpHolidayPayMinor: person.rolledUpHolidayPayMinor,
    })
    if (!provisional.nmwCheck.passed) {
      issues.push({
        code: 'below_nmw',
        severity: 'critical',
        title: `${person.displayName} below National Minimum Wage`,
        detail: provisional.nmwCheck.detail,
        employeeCostReferenceId: person.id,
      })
    }
    personSnapshots.push({
      employeeCostReferenceId: person.id,
      displayName: person.displayName,
      externalPayrollId: person.externalPayrollId,
      provisional,
    })
  }

  const totalProvisionalGrossMinor = personSnapshots.reduce(
    (s, p) => s + p.provisional.grossPayMinor,
    0,
  )

  return {
    id: input.id,
    organisationId: input.organisationId,
    payPeriodId: input.payPeriodId,
    label: input.label,
    status: critical ? 'exception' : issues.length ? 'draft' : 'validated',
    driverDayIds: input.days.map((d) => d.id),
    personSnapshots,
    validationIssues: issues,
    adjustments: [],
    lockedAt: null,
    exportedAt: null,
    providerPackageRef: null,
    finalReturnedAt: null,
    postedToLedgerAt: null,
    totalProvisionalGrossMinor,
  }
}

export function advanceWageBatch(
  batch: WageCostBatch,
  opts?: { nowIso?: string },
): WageCostBatch {
  const now = opts?.nowIso ?? new Date().toISOString()
  if (batch.status === 'exception') {
    throw new Error('Resolve exceptions before advancing the wage-cost batch')
  }
  if (hasBlockingIssues(batch) && batch.status !== 'locked') {
    // Allow lock only when no critical/disputed; earlier stages need clean validation
    if (['draft', 'validated', 'supervisor_review', 'payroll_manager_approval'].includes(batch.status)) {
      const critical = batch.validationIssues.some((i) => i.severity === 'critical')
      if (critical) throw new Error('Critical validation issues block approval')
    }
  }

  const next = FORWARD[batch.status]
  if (!next) throw new Error(`Wage batch cannot advance from ${batch.status}`)

  if (next === 'locked') {
    if (batch.validationIssues.some((i) => i.severity === 'critical')) {
      throw new Error('Cannot lock while critical issues remain')
    }
    return { ...batch, status: 'locked', lockedAt: now }
  }
  if (next === 'exported_to_provider') {
    if (batch.status !== 'locked') throw new Error('Export requires a locked batch')
    return {
      ...batch,
      status: 'exported_to_provider',
      exportedAt: now,
      providerPackageRef: `provider-export|${batch.id}|${now}`,
    }
  }
  if (next === 'final_returned') {
    return { ...batch, status: 'final_returned', finalReturnedAt: now }
  }
  if (next === 'posted_to_ledger') {
    return { ...batch, status: 'posted_to_ledger', postedToLedgerAt: now }
  }
  return { ...batch, status: next }
}

function hasBlockingIssues(batch: WageCostBatch): boolean {
  return batch.validationIssues.some((i) => i.severity === 'critical')
}

/**
 * Post-lock correction: append adjustment; never mutate personSnapshots amounts in place.
 */
export function createWageAdjustment(
  batch: WageCostBatch,
  input: {
    id: string
    employeeCostReferenceId: string
    reason: string
    grossDeltaMinor: number
    createdByRole: WageCostAdjustment['createdByRole']
    nowIso?: string
  },
): WageCostBatch {
  if (batch.status !== 'locked' && batch.status !== 'exported_to_provider' && batch.status !== 'final_returned' && batch.status !== 'posted_to_ledger') {
    throw new Error('Adjustments are only created after the pay period is locked')
  }
  if (!Number.isInteger(input.grossDeltaMinor)) {
    throw new Error('grossDeltaMinor must be an integer minor amount')
  }
  const snap = batch.personSnapshots.find(
    (p) => p.employeeCostReferenceId === input.employeeCostReferenceId,
  )
  if (!snap) throw new Error('Person is not in this wage-cost batch')

  const adjustment: WageCostAdjustment = {
    id: input.id,
    organisationId: batch.organisationId,
    wageBatchId: batch.id,
    employeeCostReferenceId: input.employeeCostReferenceId,
    createdAt: input.nowIso ?? new Date().toISOString(),
    reason: input.reason,
    grossDeltaMinor: input.grossDeltaMinor,
    createdByRole: input.createdByRole,
    replacesSnapshotNote: `Adjustment against locked gross ${snap.provisional.grossPayMinor} for ${snap.displayName}; original snapshot retained.`,
  }

  return {
    ...batch,
    adjustments: [...batch.adjustments, adjustment],
    totalProvisionalGrossMinor: batch.totalProvisionalGrossMinor + input.grossDeltaMinor,
  }
}

/** Approved payroll inputs package for the recognised provider — no PAYE fields. */
export function buildProviderExportPackage(batch: WageCostBatch): {
  batchId: string
  payPeriodId: string
  lockedAt: string | null
  lines: Array<{
    externalPayrollId: string
    displayName: string
    payableHours: string
    regulatedWorkingTime: string
    grossPayMinor: number
    lineItems: Array<{ label: string; hours: string | null; amountMinor: number }>
  }>
  adjustments: WageCostAdjustment[]
  warning: string
} {
  if (batch.status !== 'locked' && batch.status !== 'exported_to_provider') {
    throw new Error('Only locked (or already exported) batches may be packaged for the provider')
  }
  return {
    batchId: batch.id,
    payPeriodId: batch.payPeriodId,
    lockedAt: batch.lockedAt,
    lines: batch.personSnapshots.map((p) => ({
      externalPayrollId: p.externalPayrollId,
      displayName: p.displayName,
      payableHours: (p.provisional.payableHoursCenti / 100).toFixed(2),
      regulatedWorkingTime: (p.provisional.regulatedWorkingTimeCenti / 100).toFixed(2),
      grossPayMinor: p.provisional.grossPayMinor,
      lineItems: p.provisional.lines.map((l) => ({
        label: l.label,
        hours: l.hoursCenti === null ? null : (l.hoursCenti / 100).toFixed(2),
        amountMinor: l.amountMinor,
      })),
    })),
    adjustments: batch.adjustments,
    warning:
      'Provider must calculate PAYE, employee NI, pension deductions and issue the final payslip. Veyvio does not submit FPS/EPS.',
  }
}
