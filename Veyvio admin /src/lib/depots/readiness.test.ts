import { describe, expect, it } from 'vitest'
import { deriveDepotReadiness } from './readiness'
import type { DepotCapacity, DepotContacts } from './types'

const capacity: DepotCapacity = {
  vehicleCapacity: 10,
  parkingBays: 10,
  workshopBays: 2,
  washBays: 1,
  chargingPoints: 2,
  fuelPumps: 1,
}

const contacts: DepotContacts = {
  managerName: 'Alex Manager',
  assistantManagerName: null,
  dispatchContact: null,
  yardSupervisor: null,
  emergencyContact: null,
  emergencyPhone: null,
}

describe('deriveDepotReadiness', () => {
  it('returns ready when operational with manager and capacity headroom', () => {
    const result = deriveDepotReadiness(
      { status: 'operational', capacity, contacts },
      { vehiclesAssigned: 5, vehiclesVor: 0, checksOutstanding: 0 },
    )
    expect(result.level).toBe('ready')
    expect(result.reasons).toHaveLength(0)
  })

  it('blocks closed depots', () => {
    const result = deriveDepotReadiness({ status: 'closed', capacity, contacts })
    expect(result.level).toBe('blocked')
  })

  it('flags attention when manager missing or VOR spike', () => {
    const noManager = deriveDepotReadiness({
      status: 'operational',
      capacity,
      contacts: { ...contacts, managerName: null },
    })
    expect(noManager.level).toBe('attention')
    expect(noManager.reasons.some((r) => r.includes('manager'))).toBe(true)

    const vor = deriveDepotReadiness(
      { status: 'operational', capacity, contacts },
      { vehiclesAssigned: 5, vehiclesVor: 4, checksOutstanding: 0 },
    )
    expect(vor.level).toBe('attention')
  })

  it('blocks when assigned fleet exceeds capacity', () => {
    const result = deriveDepotReadiness(
      { status: 'operational', capacity, contacts },
      { vehiclesAssigned: 12, vehiclesVor: 0, checksOutstanding: 0 },
    )
    expect(result.level).toBe('blocked')
  })
})
