import { describe, expect, it } from 'vitest'
import { computeMaintenanceIntelligence } from './intelligence'
import type { VehicleProfile } from '@/lib/vehicles/types'

describe('computeMaintenanceIntelligence', () => {
  it('computes fleet average and cost alerts', () => {
    const profiles = [
      {
        id: 'v1',
        registrationNumber: 'AA11 AAA',
        mileage: 10000,
        workOrders: [{ actualCost: 2000, estimatedCost: null, type: 'repair', notes: null }],
        defects: [],
      },
      {
        id: 'v2',
        registrationNumber: 'BB22 BBB',
        mileage: 10000,
        workOrders: [{ actualCost: 500, estimatedCost: null, type: 'pmi', notes: null }],
        defects: [
          { category: 'brakes', status: 'open' },
          { category: 'brakes', status: 'open' },
        ],
      },
    ] as unknown as VehicleProfile[]

    const intel = computeMaintenanceIntelligence(profiles)
    expect(intel.fleetAvgCostPerMile).toBeGreaterThan(0)
    expect(intel.unplannedSharePercent).toBeGreaterThanOrEqual(0)
    expect(intel.costAlerts.length).toBeGreaterThan(0)
    expect(intel.costAlerts.some((a) => a.kind === 'above_fleet_avg')).toBe(true)
  })
})
