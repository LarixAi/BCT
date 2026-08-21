import { describe, expect, it } from 'vitest'
import { importPayrollSummaryForPersist } from './finance-payroll-summary-import'

describe('finance payroll summary import helper', () => {
  it('matches known employees and quarantines bad rows', () => {
    const csv = `external_payroll_id,display_name,basic_pay,overtime,employer_ni,employer_pension,source_key
PRV-1,Alex,100.00,0.00,10.00,5.00,pay|1
,MissingId,10.00,0.00,1.00,0.50,pay|bad
PRV-999,Unknown,50.00,0.00,5.00,2.00,pay|u
`
    const result = importPayrollSummaryForPersist({
      organisationId: 'org-1',
      wageCostId: 'cost-wages',
      text: csv,
      nowIso: '2026-08-07T12:00:00.000Z',
      idFactory: (() => {
        let n = 0
        return () => `id-${++n}`
      })(),
      employees: [
        {
          id: 'emp-1',
          externalPayrollId: 'PRV-1',
          displayName: 'Alex',
          expectedEmployerCostMinor: 11500,
          overtimeMinor: 0,
          allocationComplete: true,
          active: true,
          wageCostBearing: true,
        },
      ],
    })

    expect(result.totals.matchedCount).toBe(1)
    expect(result.totals.unmatchedCount).toBe(1)
    expect(result.quarantined).toHaveLength(1)
    expect(result.rolledUp?.totalEmployerCostMinor).toBe(11500)
    expect(result.reviews.some((r) => r.title.includes('Unmatched'))).toBe(true)
  })
})
