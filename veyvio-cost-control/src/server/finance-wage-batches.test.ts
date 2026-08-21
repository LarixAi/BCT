import { describe, expect, it } from 'vitest'
import {
  advanceWageBatchPayload,
  clearDisputeOnBatch,
  createWageAdjustmentPayload,
  emptyWageBatch,
  type WageCostBatch,
} from './finance-wage-batches'

function draftBatch(overrides: Partial<WageCostBatch> = {}): WageCostBatch {
  return {
    ...emptyWageBatch({
      id: 'wb_1',
      organisationId: 'org_1',
      payPeriodId: 'pp_1',
      label: 'July wage batch',
    }),
    personSnapshots: [
      {
        employeeCostReferenceId: 'ecr_1',
        displayName: 'Alex Driver',
        externalPayrollId: 'PRV-1',
        provisional: { grossPayMinor: 100_000 },
      },
    ],
    totalProvisionalGrossMinor: 100_000,
    ...overrides,
  }
}

describe('finance wage batch helpers', () => {
  it('advances draft → validated and blocks critical issues', () => {
    const next = advanceWageBatchPayload(draftBatch())
    expect(next.status).toBe('validated')

    expect(() =>
      advanceWageBatchPayload(
        draftBatch({
          validationIssues: [
            {
              code: 'disputed_hours',
              severity: 'critical',
              title: 'Disputed',
              detail: 'Hours disputed',
              driverDayId: 'dd_1',
            },
          ],
        }),
      ),
    ).toThrow(/Critical validation/)

    expect(() =>
      advanceWageBatchPayload(draftBatch({ status: 'exception' })),
    ).toThrow(/Resolve exceptions/)
  })

  it('locks and allows post-lock adjustments only', () => {
    const locked = advanceWageBatchPayload(
      draftBatch({ status: 'payroll_manager_approval' }),
      { nowIso: '2026-08-01T12:00:00.000Z' },
    )
    expect(locked.status).toBe('locked')
    expect(locked.lockedAt).toBe('2026-08-01T12:00:00.000Z')

    expect(() =>
      createWageAdjustmentPayload(draftBatch({ status: 'draft' }), {
        id: 'adj_1',
        employeeCostReferenceId: 'ecr_1',
        reason: 'too early',
        grossDeltaMinor: 100,
        createdByRole: 'payroll_manager',
      }),
    ).toThrow(/after the pay period is locked/)

    const adjusted = createWageAdjustmentPayload(locked, {
      id: 'adj_1',
      employeeCostReferenceId: 'ecr_1',
      reason: 'Overtime correction',
      grossDeltaMinor: -2_250,
      createdByRole: 'payroll_manager',
      nowIso: '2026-08-02T09:00:00.000Z',
    })
    expect(adjusted.adjustments).toHaveLength(1)
    expect(adjusted.totalProvisionalGrossMinor).toBe(97_750)
  })

  it('clears disputed hours and returns exception batches to draft', () => {
    const cleared = clearDisputeOnBatch(
      draftBatch({
        status: 'exception',
        driverDayIds: ['dd_1'],
        validationIssues: [
          {
            code: 'disputed_hours',
            severity: 'critical',
            title: 'Disputed',
            detail: 'Hours disputed',
            driverDayId: 'dd_1',
          },
        ],
      }),
      'dd_1',
    )
    expect(cleared.validationIssues).toHaveLength(0)
    expect(cleared.status).toBe('draft')
  })
})
