import { describe, expect, it } from 'vitest'
import {
  buildFleetResourcesHub,
  filterFuelTransactions,
} from './aggregate'
import { flagFuelAnomalies } from './fuel-rules'
import { createFleetResourcesSeed } from './seed'

describe('buildFleetResourcesHub', () => {
  it('builds attention summary and alerts from seed', () => {
    const seed = createFleetResourcesSeed()
    const hub = buildFleetResourcesHub(seed)
    expect(hub.transactions.length).toBeGreaterThanOrEqual(5)
    expect(hub.summary.missingReceipts).toBeGreaterThan(0)
    expect(hub.summary.lowDepotStock).toBeGreaterThan(0)
    expect(hub.summary.tyresNeedingAttention).toBeGreaterThan(0)
    expect(hub.summary.missingEquipment).toBeGreaterThan(0)
    expect(hub.tyres.length).toBeGreaterThan(0)
    expect(hub.equipment.length).toBeGreaterThan(0)
    expect(hub.forecasts.length).toBeGreaterThan(0)
    expect(hub.integrations.length).toBeGreaterThan(0)
    expect(hub.budgets.length).toBeGreaterThan(0)
    expect(hub.alerts.length).toBeGreaterThan(0)
    expect(hub.vehicleCosts.some((v) => v.registrationNumber === 'AB12 CDE')).toBe(true)
  })

  it('filters fuel register views', () => {
    const seed = createFleetResourcesSeed()
    const hub = buildFleetResourcesHub(seed)
    const missing = filterFuelTransactions(hub.transactions, 'missing_receipt', '')
    expect(missing.some((t) => t.id === 'rtx-fuel-2')).toBe(true)

    const anomaly = filterFuelTransactions(hub.transactions, 'anomaly', '')
    expect(anomaly.some((t) => t.anomalyFlags.length > 0)).toBe(true)

    const search = filterFuelTransactions(hub.transactions, 'all', 'CD34')
    expect(search.every((t) => (t.registrationNumber ?? '').includes('CD34'))).toBe(true)
  })
})

describe('flagFuelAnomalies', () => {
  it('flags missing receipt and odometer', () => {
    const flags = flagFuelAnomalies(
      {
        quantity: 50,
        unit: 'L',
        resourceCategory: 'fuel',
        odometer: null,
        receiptFileName: null,
        grossAmount: 80,
      },
      { maxLitres: 200, requireReceiptAbove: 50, requireOdometer: true },
    )
    expect(flags).toContain('missing_odometer')
    expect(flags).toContain('missing_receipt')
  })
})
