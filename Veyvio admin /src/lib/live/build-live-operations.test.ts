import { describe, expect, it } from 'vitest'
import {
  buildLiveOperations,
  filterLiveRuns,
} from './build-live-operations'
import {
  mapServiceHealth,
  mapTripLifecycle,
} from './canonical-trip-states'
import type { LiveDispatchResponse } from '@/lib/api/types'

describe('live trip canonical states', () => {
  it('maps lifecycle and health without free-text statuses', () => {
    expect(mapTripLifecycle('passenger_boarded')).toBe('PASSENGER_ONBOARD')
    expect(mapTripLifecycle('in_progress')).toBe('EN_ROUTE_TO_PICKUP')
    expect(mapServiceHealth({ delayMinutes: 12 })).toBe('late')
    expect(mapServiceHealth({ delayMinutes: 0, isStale: true })).toBe('at_risk')
    expect(mapServiceHealth({ blocked: true })).toBe('blocked')
  })
})

describe('buildLiveOperations', () => {
  const live: LiveDispatchResponse = {
    date: '2026-07-17',
    generatedAt: '2026-07-17T18:12:00Z',
    trackingEnabled: true,
    vehicles: [
      {
        dutyId: 'duty-1',
        reference: 'AM-104',
        status: 'passenger_boarded',
        routeName: 'School AM',
        driverId: 'drv-1',
        driverName: 'Jane Smith',
        vehicleRegistration: 'LK23 ABC',
        lastLatitude: 51.5,
        lastLongitude: -0.2,
        lastPositionAt: '2026-07-17T18:11:40Z',
        staleMinutes: 0,
        isStale: false,
        delayMinutes: 0,
        plannedStartAt: '2026-07-17T07:40:00Z',
        plannedEndAt: '2026-07-17T09:00:00Z',
        staleThresholdMinutes: 10,
        nextStop: {
          routeStopId: 's2',
          name: 'Oakwood Primary',
          stopOrder: 2,
          distanceM: 400,
          etaMinutes: 6,
          pickupTime: '08:20',
        },
        routeTotalStops: 8,
        routeCompletedStops: 5,
        routeProgressPercent: 62,
      },
      {
        dutyId: 'duty-2',
        reference: 'AM-107',
        status: 'assigned',
        routeName: 'Day Centre',
        driverId: 'drv-2',
        driverName: 'Michael Patel',
        vehicleRegistration: 'YG68 AKF',
        lastLatitude: 51.51,
        lastLongitude: -0.14,
        lastPositionAt: '2026-07-17T17:50:00Z',
        staleMinutes: 22,
        isStale: true,
        delayMinutes: 45,
        plannedStartAt: '2026-07-17T17:00:00Z',
        plannedEndAt: '2026-07-17T18:00:00Z',
        staleThresholdMinutes: 10,
        nextStop: {
          routeStopId: 's1',
          name: 'Riverside',
          stopOrder: 1,
          distanceM: 900,
          etaMinutes: 15,
          pickupTime: '09:00',
        },
        routeTotalStops: 6,
        routeCompletedStops: 3,
        routeProgressPercent: 50,
      },
    ],
  }

  it('builds summary cards, delay indicators, exceptions and activity', () => {
    const model = buildLiveOperations({
      live,
      completedLive: { ...live, vehicles: [] },
      duties: [],
      dashboard: {
        todaysActiveDuties: 2,
        vehiclesInService: 2,
        vehiclesOffRoad: 0,
        driversOnDuty: 2,
        openDefects: 0,
        openIncidents: 0,
        expiringDocuments: 0,
        alerts: [
          {
            severity: 'danger',
            title: 'Driver assistance requested — Michael Patel',
            href: '/live-operations?duty=duty-2',
            category: 'safety',
          },
        ],
        navBadges: { defects: 0, compliance: 0 },
        timeline: [],
      },
      driverExceptions: [],
      vehicleExceptions: [],
      now: new Date('2026-07-17T18:12:00Z'),
    })

    expect(model.summary.activeRuns).toBe(2)
    expect(model.summary.onboard).toBe(1)
    expect(model.summary.late).toBeGreaterThanOrEqual(1)
    expect(model.summary.assistanceRequests).toBe(1)
    expect(model.runs.find((r) => r.runReference === 'AM-104')?.health).toBe('on_time')
    expect(model.runs.find((r) => r.runReference === 'AM-104')?.passengerOnboard).toBe(true)
    expect(model.runs.find((r) => r.runReference === 'AM-107')?.health).toBe('severely_late')
    expect(model.runs.find((r) => r.runReference === 'AM-107')?.delayMinutes).toBe(45)
    expect(model.runs.find((r) => r.runReference === 'AM-107')?.isStale).toBe(true)
    expect(model.exceptions.some((e) => e.severity === 'critical')).toBe(true)
    expect(model.activity.length).toBeGreaterThan(0)
    expect(model.connection.status).toBe('delayed')
  })

  it('filters late and stale runs for the board', () => {
    const model = buildLiveOperations({
      live,
      now: new Date('2026-07-17T18:12:00Z'),
    })
    const late = filterLiveRuns(model.runs, 'late', '')
    const stale = filterLiveRuns(model.runs, 'stale_gps', '')
    expect(late.every((r) => r.health === 'late' || r.health === 'severely_late')).toBe(true)
    expect(stale.every((r) => r.isStale)).toBe(true)
    expect(filterLiveRuns(model.runs, 'all', 'jane')).toHaveLength(1)
  })
})
