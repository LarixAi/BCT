import { describe, expect, it } from 'vitest'
import { importCostCsvForPersist } from './finance-csv-import'

describe('finance CSV import helper', () => {
  it('accepts valid rows and quarantines invalid ones', () => {
    const csv = `date,supplier,description,reference,category,status,net,vat,gross,evidence,source_key
2026-08-07,Shell,Fuel,SH-1,fuel,actual,10.00,2.00,12.00,receipt.pdf,shell|1
2026-08-07,Bad,,,fuel,actual,1.00,0.20,1.20,,bad|1
2026-08-07,Shell,Dup,SH-1,fuel,actual,10.00,2.00,12.00,receipt.pdf,shell|1
`
    const result = importCostCsvForPersist({
      organisationId: 'org-1',
      budgetId: 'bud-1',
      existingSourceKeys: new Set(),
      text: csv,
      nowIso: '2026-08-07T12:00:00.000Z',
      idFactory: (() => {
        let n = 0
        return () => `id-${++n}`
      })(),
    })
    expect(result.rowsRead).toBe(3)
    expect(result.accepted).toHaveLength(1)
    expect(result.quarantined).toHaveLength(1)
    expect(result.duplicatesSkipped).toBe(1)
    expect(result.accepted[0]?.reviewState).toBe('none')
    expect(result.accepted[0]?.evidenceLabel).toBe('receipt.pdf')
  })
})
