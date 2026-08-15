import { describe, expect, it } from 'vitest'
import { parseOptionalModelYear } from './safe-hubs'

describe('parseOptionalModelYear', () => {
  it('keeps finite numbers', () => {
    expect(parseOptionalModelYear(2019)).toBe(2019)
  })

  it('parses numeric strings without comparing number | null to empty string', () => {
    expect(parseOptionalModelYear('2021')).toBe(2021)
    expect(parseOptionalModelYear('')).toBeNull()
    expect(parseOptionalModelYear('  ')).toBeNull()
  })

  it('rejects non-year values', () => {
    expect(parseOptionalModelYear(null)).toBeNull()
    expect(parseOptionalModelYear(undefined)).toBeNull()
    expect(parseOptionalModelYear('Sprinter')).toBeNull()
    expect(parseOptionalModelYear(Number.NaN)).toBeNull()
  })
})
