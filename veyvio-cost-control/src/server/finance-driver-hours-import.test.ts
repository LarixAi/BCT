import { describe, expect, it } from 'vitest'
import {
  SAMPLE_DRIVER_HOURS_CSV,
  importDriverHoursForPersist,
} from './finance-driver-hours-import'
import { buildWageCostBatchPayload } from './finance-wage-batches'

describe('driver hours import', () => {
  it('parses sample CSV, quarantines unmatched, rebuilds batch', () => {
    const parsed = importDriverHoursForPersist({
      organisationId: 'org_1',
      payPeriodId: 'pp_1',
      text: SAMPLE_DRIVER_HOURS_CSV,
      employees: [
        { id: 'ecr_1', externalPayrollId: 'PRV-2001', displayName: 'Taylor Wheel' },
        { id: 'ecr_2', externalPayrollId: 'PRV-2002', displayName: 'Jamie Lane' },
      ],
      idFactory: (() => {
        let n = 0
        return () => `q-${++n}`
      })(),
    })

    expect(parsed.rowsRead).toBe(5)
    expect(parsed.days).toHaveLength(5)
    expect(parsed.rates.length).toBeGreaterThanOrEqual(2)
    expect(parsed.quarantined).toHaveLength(0)

    const batch = buildWageCostBatchPayload({
      id: 'wb_1',
      organisationId: 'org_1',
      payPeriodId: 'pp_1',
      label: 'Test batch',
      days: parsed.days,
      rates: parsed.rates,
      people: [
        { id: 'ecr_1', displayName: 'Taylor Wheel', externalPayrollId: 'PRV-2001' },
        { id: 'ecr_2', displayName: 'Jamie Lane', externalPayrollId: 'PRV-2002' },
      ],
    })
    expect(batch.status).toBe('exception')
    expect(batch.personSnapshots).toHaveLength(2)
    expect(batch.validationIssues.some((i) => i.code === 'disputed_hours')).toBe(true)
  })

  it('quarantines unknown payroll ids', () => {
    const parsed = importDriverHoursForPersist({
      organisationId: 'org_1',
      payPeriodId: 'pp_1',
      text: `external_payroll_id,work_date,basic_hours,basic_hourly
UNKNOWN,2026-07-01,8.00,15.00
`,
      employees: [{ id: 'ecr_1', externalPayrollId: 'PRV-2001', displayName: 'Taylor' }],
      idFactory: () => 'q-1',
    })
    expect(parsed.days).toHaveLength(0)
    expect(parsed.quarantined).toHaveLength(1)
    expect(parsed.unmatchedExternalIds).toEqual(['UNKNOWN'])
  })
})
