import { describe, expect, it } from 'vitest'
import { evaluateResourceReadiness } from './readiness'
import { createFleetResourcesSeed } from './seed'
import type { VehicleProfile } from '@/lib/vehicles/types'

function baseProfile(overrides: Partial<VehicleProfile> = {}): VehicleProfile {
  return {
    id: 'veh-4',
    registrationNumber: 'CD34 EFG',
    fuelLevelPercent: 40,
    wheelLayout: [],
    equipment: [],
    ...overrides,
  } as VehicleProfile
}

describe('evaluateResourceReadiness', () => {
  it('blocks unsafe fitted tyres from the resource ledger', () => {
    const seed = createFleetResourcesSeed()
    const result = evaluateResourceReadiness({
      profile: baseProfile(),
      tyres: seed.tyres,
      equipment: seed.equipment,
    })
    expect(result.decision).toBe('blocked')
    expect(result.issues.some((i) => i.code === 'tyre_tread_low' || i.code === 'tyre_replace')).toBe(
      true,
    )
  })

  it('blocks missing required equipment', () => {
    const seed = createFleetResourcesSeed()
    const result = evaluateResourceReadiness({
      profile: baseProfile({ fuelLevelPercent: 80, id: 'veh-4' }),
      tyres: seed.tyres.filter((t) => t.vehicleId !== 'veh-4'),
      equipment: seed.equipment,
    })
    expect(result.issues.some((i) => i.code === 'equipment_not_ready')).toBe(true)
  })

  it('warns on low fuel', () => {
    const result = evaluateResourceReadiness({
      profile: baseProfile({ id: 'veh-1', registrationNumber: 'AB12 CDE', fuelLevelPercent: 15 }),
      tyres: [],
      equipment: [],
    })
    expect(result.issues.some((i) => i.code === 'low_fuel')).toBe(true)
    expect(result.decision).not.toBe('ready')
  })
})
