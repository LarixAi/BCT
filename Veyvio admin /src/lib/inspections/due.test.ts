import { describe, expect, it } from 'vitest'
import { createInspectionSeed } from './seed'
import { daysUntil, hasMissingBrakeEvidence, isDueToday, isDueWithin, isOverdueDate } from './due'

describe('inspection due helpers', () => {
  it('classifies overdue and due windows', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    const inThree = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    expect(isOverdueDate(yesterday)).toBe(true)
    expect(isDueToday(today)).toBe(true)
    expect(isDueWithin(inThree, 7)).toBe(true)
    expect(isDueWithin(inThree, 2)).toBe(false)
    expect(daysUntil(yesterday)).toBeLessThan(0)
  })

  it('flags missing brake evidence on safety PMI in progress', () => {
    const seed = createInspectionSeed()
    const overdue = seed.find((r) => r.id === 'insp-pmi-overdue')
    expect(overdue).toBeTruthy()
    expect(hasMissingBrakeEvidence(overdue!)).toBe(true)

    const signed = seed.find((r) => r.id === 'insp-pmi-signed')
    expect(hasMissingBrakeEvidence(signed!)).toBe(false)
  })
})
