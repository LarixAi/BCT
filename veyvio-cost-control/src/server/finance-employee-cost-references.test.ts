import { describe, expect, it } from 'vitest'
import { parseEmployeeCostReferenceInputs } from './finance-employee-cost-references'

describe('employee cost reference validation', () => {
  it('parses and rejects invalid payloads', () => {
    const rows = parseEmployeeCostReferenceInputs([
      {
        externalPayrollId: 'PRV-1',
        displayName: 'Alex',
        expectedEmployerCostMinor: 11500,
        costCentre: 'CC-OPS',
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.externalPayrollId).toBe('PRV-1')
    expect(rows[0]?.wageCostBearing).toBe(true)

    expect(() => parseEmployeeCostReferenceInputs([])).toThrow(/employees_required/)
    expect(() =>
      parseEmployeeCostReferenceInputs([
        { externalPayrollId: 'A', displayName: 'One' },
        { externalPayrollId: 'a', displayName: 'Dup' },
      ]),
    ).toThrow(/duplicate_external_payroll_id/)
  })
})
