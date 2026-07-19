import { describe, expect, it } from 'vitest'
import type { LiveDispatchVehicle } from '@/lib/api/types'
import type { LiveRunRow } from '@/lib/live/live-operations'
import { toLiveMapVehicles } from './toLiveMapVehicles'

function vehicle(partial: Partial<LiveDispatchVehicle> & Pick<LiveDispatchVehicle, 'dutyId'>): LiveDispatchVehicle {
  return {
    reference: 'AM-104',
    status: 'in_progress',
    routeName: null,
    driverId: null,
    driverName: 'Alex Driver',
    vehicleRegistration: 'LK23 ABC',
    lastLatitude: 51.5,
    lastLongitude: -0.12,
    lastPositionAt: '2026-07-17T10:00:00Z',
    staleMinutes: null,
    isStale: false,
    staleThresholdMinutes: 10,
    nextStop: null,
    routeTotalStops: 0,
    routeCompletedStops: 0,
    routeProgressPercent: null,
    ...partial,
  }
}

function run(partial: Partial<LiveRunRow> & Pick<LiveRunRow, 'id' | 'health'>): LiveRunRow {
  return {
    runReference: 'AM-104',
    serviceType: 'school',
    driverName: 'Alex Driver',
    driverId: null,
    vehicleRegistration: 'LK23 ABC',
    progressLabel: '2/5',
    tripProgress: null,
    healthLabel: 'On time',
    delayMinutes: 0,
    nextStop: null,
    nextAction: 'Monitor',
    stage: 'EN_ROUTE_TO_PICKUP',
    stageLabel: 'En route',
    lastUpdateLabel: 'now',
    isStale: false,
    isMoving: true,
    hasException: false,
    passengerOnboard: false,
    wheelchair: false,
    escortRequired: false,
    latitude: 51.5,
    longitude: -0.12,
    href: '/runs/1',
    ...partial,
  }
}

describe('toLiveMapVehicles', () => {
  it('maps run health into marker status and skips vehicles without GPS', () => {
    const mapped = toLiveMapVehicles(
      [
        vehicle({ dutyId: 'd1', lastLatitude: 51.5, lastLongitude: -0.1 }),
        vehicle({ dutyId: 'd2', lastLatitude: null, lastLongitude: null }),
        vehicle({ dutyId: 'd3', isStale: true, lastLatitude: 51.4, lastLongitude: -0.2 }),
        vehicle({ dutyId: 'd4', lastLatitude: 51.3, lastLongitude: -0.15 }),
      ],
      [
        run({ id: 'd1', health: 'on_time' }),
        run({ id: 'd3', health: 'late', isStale: true }),
        run({ id: 'd4', health: 'at_risk' }),
      ],
    )

    expect(mapped).toHaveLength(3)
    expect(mapped.find((v) => v.id === 'd1')?.status).toBe('ON_TIME')
    expect(mapped.find((v) => v.id === 'd3')?.status).toBe('OFFLINE')
    expect(mapped.find((v) => v.id === 'd4')?.status).toBe('AT_RISK')
  })

  it('filters to stale-only when requested', () => {
    const mapped = toLiveMapVehicles(
      [
        vehicle({ dutyId: 'fresh', isStale: false }),
        vehicle({ dutyId: 'stale', isStale: true, lastLatitude: 51.2, lastLongitude: -0.1 }),
      ],
      [run({ id: 'fresh', health: 'on_time' }), run({ id: 'stale', health: 'late', isStale: true })],
      { staleOnly: true },
    )

    expect(mapped).toEqual([
      expect.objectContaining({ id: 'stale', status: 'OFFLINE' }),
    ])
  })
})
