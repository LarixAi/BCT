import { describe, expect, it } from 'vitest'
import { createInspectionSeed } from './seed'
import { canSignOffInspection, inspectionSignOffBlockers } from './sign-off'

describe('inspection sign-off blockers', () => {
  it('blocks sign-off when safety defects and open WOs remain', () => {
    const seed = createInspectionSeed()
    const overdue = seed.find((r) => r.id === 'insp-pmi-overdue')!
    const blockers = inspectionSignOffBlockers(overdue)
    expect(blockers.some((b) => b.includes('safety defect') || b.includes('checklist') || b.includes('work order'))).toBe(
      true,
    )
    expect(canSignOffInspection(overdue)).toBe(false)
  })

  it('allows sign-off when checklist complete and no open defects/WOs', () => {
    const seed = createInspectionSeed()
    const ready = seed.find((r) => r.id === 'insp-pmi-signoff')!
    expect(inspectionSignOffBlockers(ready)).toEqual([])
    expect(canSignOffInspection(ready)).toBe(true)
  })

  it('blocks failed VOR outcomes', () => {
    const seed = createInspectionSeed()
    const failed = seed.find((r) => r.id === 'insp-failed-vor')!
    expect(inspectionSignOffBlockers(failed).some((b) => b.toLowerCase().includes('vor'))).toBe(true)
    expect(canSignOffInspection(failed)).toBe(false)
  })
})
