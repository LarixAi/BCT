import { describe, expect, it } from 'vitest'
import { formatMileage, normalizeAdBlueRecords } from './normalize'

describe('normalizeAdBlueRecords', () => {
  it('accepts odometer alias and missing mileage without throwing', () => {
    const rows = normalizeAdBlueRecords([
      { id: '1', odometer: 12000, quantity: 5, recordedBy: 'Larone' },
      { id: '2', mileage: null, amountLitres: 3 },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.mileage).toBe(12000)
    expect(rows[0]?.amountLitres).toBe(5)
    expect(rows[1]?.mileage).toBe(0)
    expect(formatMileage(rows[1]?.mileage)).toBe('0 mi')
    expect(formatMileage(undefined)).toBe('—')
  })

  it('returns empty list for non-arrays', () => {
    expect(normalizeAdBlueRecords(null)).toEqual([])
    expect(normalizeAdBlueRecords({ foo: 1 })).toEqual([])
  })
})
