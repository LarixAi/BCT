/**
 * Wage-cost batch lifecycle helpers for finance-api (Deno).
 * Employer wage-cost inputs only — not PAYE.
 */

import {
  computeProvisionalGross,
  validateDriverDays,
  type DriverDayRecord,
  type EffectivePayRate,
} from './finance-driver-wage-hours'

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

export type WageCostAdjustment = {
  id: string
  organisationId: string
  wageBatchId: string
  employeeCostReferenceId: string
  createdAt: string
  reason: string
  grossDeltaMinor: number
  createdByRole: 'payroll_manager' | 'finance'
  replacesSnapshotNote: string
}

export type WageCostBatch = {
  id: string
  organisationId: string
  payPeriodId: string
  label: string
  status: WageBatchLifecycle
  driverDayIds: string[]
  personSnapshots: Array<{
    employeeCostReferenceId: string
    displayName: string
    externalPayrollId: string
    provisional: { grossPayMinor: number; [key: string]: unknown }
  }>
  validationIssues: Array<{
    code: string
    severity: string
    title: string
    detail: string
    driverDayId?: string
    employeeCostReferenceId?: string
  }>
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

export function advanceWageBatchPayload(
  batch: WageCostBatch,
  opts?: { nowIso?: string },
): WageCostBatch {
  const now = opts?.nowIso ?? new Date().toISOString()
  if (batch.status === 'exception') {
    throw new Error('Resolve exceptions before advancing the wage-cost batch')
  }
  if (
    ['draft', 'validated', 'supervisor_review', 'payroll_manager_approval'].includes(batch.status) &&
    batch.validationIssues.some((i) => i.severity === 'critical')
  ) {
    throw new Error('Critical validation issues block approval')
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

export function createWageAdjustmentPayload(
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
  if (
    batch.status !== 'locked' &&
    batch.status !== 'exported_to_provider' &&
    batch.status !== 'final_returned' &&
    batch.status !== 'posted_to_ledger'
  ) {
    throw new Error('Adjustments are only created after the pay period is locked')
  }
  if (!Number.isInteger(input.grossDeltaMinor)) {
    throw new Error('grossDeltaMinor must be an integer minor amount')
  }
  const reason = input.reason.trim()
  if (!reason) throw new Error('Adjustment reason is required')

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
    reason,
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

export function clearDisputeOnBatch(
  batch: WageCostBatch,
  driverDayId: string,
): WageCostBatch {
  const remaining = batch.validationIssues.filter(
    (i) => !(i.code === 'disputed_hours' && i.driverDayId === driverDayId),
  )
  const stillCritical = remaining.some((i) => i.severity === 'critical')
  return {
    ...batch,
    validationIssues: remaining,
    status: stillCritical
      ? batch.status
      : batch.status === 'exception'
        ? 'draft'
        : batch.status,
  }
}

export function emptyWageBatch(input: {
  id: string
  organisationId: string
  payPeriodId: string
  label: string
}): WageCostBatch {
  return {
    id: input.id,
    organisationId: input.organisationId,
    payPeriodId: input.payPeriodId,
    label: input.label,
    status: 'draft',
    driverDayIds: [],
    personSnapshots: [],
    validationIssues: [],
    adjustments: [],
    lockedAt: null,
    exportedAt: null,
    providerPackageRef: null,
    finalReturnedAt: null,
    postedToLedgerAt: null,
    totalProvisionalGrossMinor: 0,
  }
}

export function isWageBatchLockedOrBeyond(status: WageBatchLifecycle): boolean {
  return [
    'locked',
    'exported_to_provider',
    'final_returned',
    'posted_to_ledger',
  ].includes(status)
}

/** Rebuild draft/exception batch snapshots from durable driver-days + rates. */
export function buildWageCostBatchPayload(input: {
  id: string
  organisationId: string
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
  const personSnapshots: WageCostBatch['personSnapshots'] = []

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
    (s, p) => s + Number(p.provisional.grossPayMinor ?? 0),
    0,
  )

  return {
    id: input.id,
    organisationId: input.organisationId,
    payPeriodId: input.payPeriodId,
    label: input.label,
    status: critical || issues.some((i) => i.severity === 'critical') ? 'exception' : issues.length ? 'draft' : 'validated',
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
