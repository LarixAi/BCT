import { describe, expect, it } from 'vitest'
import { projectInspectionsFromProfiles } from './project-from-profiles'
import type { VehicleProfile } from '@/lib/vehicles/types'

describe('projectInspectionsFromProfiles', () => {
  it('returns empty hub when no profiles', () => {
    const hub = projectInspectionsFromProfiles([])
    expect(hub.register).toEqual([])
    expect(hub.summary.overdue).toBe(0)
    expect(hub.providers.length).toBeGreaterThan(0)
  })

  it('projects PMI and annual prep from profile dates', () => {
    const profile = {
      id: 'veh-x',
      registrationNumber: 'XX99 TST',
      fleetNumber: 'F-99',
      vehicleCategory: 'minibus',
      lifecycleStatus: 'active',
      operationalStatus: 'available',
      currentDepotName: 'Test Depot',
      homeDepotName: 'Test Depot',
      mileage: 10000,
      nextMaintenanceDate: '2026-07-20',
      nextMaintenanceMileage: 12000,
      motExpiry: '2026-08-01',
      pmiInterval: { intervalWeeks: 8, lastCompletedAt: '2026-05-01' },
    } as unknown as VehicleProfile

    const hub = projectInspectionsFromProfiles([profile])
    expect(hub.register.some((r) => r.inspectionType === 'safety_pmi')).toBe(true)
    expect(hub.register.some((r) => r.inspectionType === 'annual_prep')).toBe(true)
    expect(hub.calendar.length).toBe(hub.register.length)
  })
})
