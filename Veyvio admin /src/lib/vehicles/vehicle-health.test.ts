import { describe, expect, it } from 'vitest'
import { mockVehiclesApi } from '@/lib/api/mock-vehicles'
import { buildMaintenanceScheduleCards, computeVehicleHealth } from './vehicle-health'
import { buildVehicleTimeline } from './vehicle-timeline'

describe('computeVehicleHealth', () => {
  it('scores a ready vehicle highly', () => {
    const vehicle = mockVehiclesApi.get('veh-1')
    expect(vehicle).toBeTruthy()
    const health = computeVehicleHealth(vehicle!)
    expect(health.score).toBeGreaterThan(50)
    expect(health.availabilityLabel).toBeTruthy()
  })

  it('marks VOR vehicles as not roadworthy', () => {
    const vehicle = mockVehiclesApi.list().find((v) => v.operationalStatus === 'vor')
    if (!vehicle) return
    const health = computeVehicleHealth(vehicle)
    expect(health.vorActive).toBe(true)
    expect(health.roadworthy).toBe(false)
    expect(health.score).toBeLessThan(70)
  })
})

describe('buildMaintenanceScheduleCards', () => {
  it('always includes PMI and MOT cards', () => {
    const vehicle = mockVehiclesApi.get('veh-1')
    expect(vehicle).toBeTruthy()
    const cards = buildMaintenanceScheduleCards(vehicle!)
    expect(cards.some((c) => c.id === 'pmi')).toBe(true)
    expect(cards.some((c) => c.id === 'mot')).toBe(true)
  })
})

describe('buildVehicleTimeline', () => {
  it('merges defects, work orders and audits into one feed', () => {
    const vehicle = mockVehiclesApi.list().find((v) => v.defects.length > 0 || v.workOrders.length > 0)
    expect(vehicle).toBeTruthy()
    const events = buildVehicleTimeline(vehicle!)
    expect(events.length).toBeGreaterThan(0)
    const times = events.map((e) => new Date(e.occurredAt).getTime())
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })
})
