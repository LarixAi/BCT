import { describe, expect, it } from 'vitest'
import { mockVehiclesApi } from '@/lib/api/mock-vehicles'
import { emptyFleetResourcesHub } from './empty-hub'
import {
  enrichSparseLiveHub,
  equipmentAssetsFromProfiles,
  fuelCardsFromProfiles,
} from './enrich-sparse-hub'

describe('enrichSparseLiveHub', () => {
  it('builds equipment rows from vehicle kit when live hub is empty', () => {
    const profiles = mockVehiclesApi.list().slice(0, 2)
    const equipment = equipmentAssetsFromProfiles(profiles)
    expect(equipment.length).toBeGreaterThan(0)
    expect(equipment.every((e) => e.qrCode)).toBe(true)
    expect(equipment.some((e) => e.vehicleId === profiles[0]!.id)).toBe(true)
  })

  it('fills empty live registers from profiles', () => {
    const profiles = mockVehiclesApi.list().slice(0, 3)
    const hub = enrichSparseLiveHub(emptyFleetResourcesHub(), profiles)
    expect(hub.equipment.length).toBeGreaterThan(0)
    expect(hub.cards.length).toBe(profiles.length)
    expect(hub.cards[0]!.assignedRegistration).toBe(profiles[0]!.registrationNumber)
  })

  it('does not overwrite non-empty live registers', () => {
    const profiles = mockVehiclesApi.list().slice(0, 2)
    const base = emptyFleetResourcesHub()
    const existing = fuelCardsFromProfiles(profiles).slice(0, 1)
    const hub = enrichSparseLiveHub({ ...base, cards: existing }, profiles)
    expect(hub.cards).toHaveLength(1)
    expect(hub.equipment.length).toBeGreaterThan(0)
  })
})
