import { describe, expect, it } from 'vitest'
import { buildInspectionsHub, filterInspectionRegister } from './aggregate'
import { createInspectionSeed } from './seed'

describe('buildInspectionsHub', () => {
  it('builds summary attention counts from multi-type seed', () => {
    const hub = buildInspectionsHub(createInspectionSeed())
    expect(hub.register.length).toBeGreaterThanOrEqual(8)
    expect(hub.summary.overdue).toBeGreaterThan(0)
    expect(hub.summary.awaitingSignOff).toBeGreaterThan(0)
    expect(hub.summary.awaitingRectification).toBeGreaterThan(0)
    expect(hub.calendar.length).toBe(hub.register.length)
    expect(hub.providers.length).toBeGreaterThan(0)
  })

  it('filters saved views', () => {
    const hub = buildInspectionsHub(createInspectionSeed())
    const overdue = filterInspectionRegister(hub.register, 'overdue', '')
    expect(overdue.every((r) => r.status !== 'signed_off')).toBe(true)
    expect(overdue.length).toBeGreaterThan(0)

    const missingBrake = filterInspectionRegister(hub.register, 'missing_brake', '')
    expect(missingBrake.some((r) => r.id === 'insp-pmi-overdue' || r.id === 'insp-pmi-progress')).toBe(true)

    const search = filterInspectionRegister(hub.register, 'all', 'CD34')
    expect(search.every((r) => r.registrationNumber.includes('CD34'))).toBe(true)
  })
})
