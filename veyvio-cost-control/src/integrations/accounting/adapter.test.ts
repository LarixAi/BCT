import { describe, expect, it } from 'vitest'
import { createSeedStore } from '../../data/seed'
import { buildApprovedCostExportBatch } from './adapter'

describe('accountant cost export', () => {
  it('exports only approved actual costs and produces a stable checksum', () => {
    const store = createSeedStore()
    const input = {
      organisationId: store.organisation.id,
      costs: store.costs,
      createdAt: '2026-07-30T12:00:00.000Z',
    }
    const first = buildApprovedCostExportBatch(input)
    const second = buildApprovedCostExportBatch(input)

    expect(first.rows.every((row) => Number.isInteger(row.grossMinor))).toBe(true)
    expect(first.rows.every((row) => row.organisationId === store.organisation.id)).toBe(true)
    expect(first.checksum).toBe(second.checksum)
    expect(first.controlTotalGrossMinor).toBe(
      first.rows.reduce((sum, row) => sum + row.grossMinor, 0),
    )
  })

  it('does not export unapproved, committed or cross-tenant costs', () => {
    const store = createSeedStore()
    const batch = buildApprovedCostExportBatch({
      organisationId: store.organisation.id,
      costs: [
        ...store.costs,
        { ...store.costs[0], id: 'foreign', organisationId: 'another_org' },
      ],
      createdAt: '2026-07-30T12:00:00.000Z',
    })
    const exportedIds = new Set(batch.rows.map((row) => row.costId))
    for (const cost of store.costs) {
      expect(exportedIds.has(cost.id)).toBe(
        cost.status === 'actual' && cost.reviewState === 'approved',
      )
    }
    expect(exportedIds.has('foreign')).toBe(false)
  })
})
