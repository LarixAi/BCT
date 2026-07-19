import { describe, expect, it } from 'vitest'
import { buildEstimateFromCosts, isLowStock, SEED_PARTS } from './suppliers'

describe('isLowStock', () => {
  it('flags parts at or below reorder level', () => {
    const low = SEED_PARTS.find((p) => p.id === 'part-2')!
    expect(isLowStock(low)).toBe(true)
    const ok = SEED_PARTS.find((p) => p.id === 'part-3')!
    expect(isLowStock(ok)).toBe(false)
  })
})

describe('buildEstimateFromCosts', () => {
  it('totals labour and parts', () => {
    const estimate = buildEstimateFromCosts({
      labourHours: 2,
      labourRate: 65,
      partsCost: 50,
      status: 'submitted',
      submittedBy: 'Tech',
    })
    expect(estimate.labourCost).toBe(130)
    expect(estimate.totalCost).toBe(180)
    expect(estimate.status).toBe('submitted')
  })
})
