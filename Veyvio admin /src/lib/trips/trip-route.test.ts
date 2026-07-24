import { describe, expect, it } from 'vitest'
import {
  buildTripRouteVersions,
  tripListRow,
  tripRouteMetrics,
  tripRouteWarning,
  tripStops,
} from '@/lib/trips/trip-route'
import type { OperationalTrip } from '@/lib/transfers/types'

const baseTrip: OperationalTrip = {
  id: 'trip-test',
  reference: 'TRP-TEST',
  dutyId: 'duty-3',
  runReference: 'SCH-PM-207',
  status: 'planned',
  driverId: null,
  driverName: null,
  vehicleId: null,
  vehicleRegistration: null,
  depotId: 'depot-wembley',
  depotName: 'Wembley Depot',
  assignmentStatus: 'unassigned',
  acceptedAt: null,
  acknowledgedAt: null,
  manifestVersion: 2,
  lastAppSync: null,
  delayMinutes: 0,
  passengersOnboard: 0,
  completedJobCount: 0,
  totalJobCount: 2,
  activeJobId: null,
  routeName: 'School PM Return',
  gpsLat: null,
  gpsLng: null,
  driverOnline: false,
  jobs: [
    {
      id: 'job-1',
      tripId: 'trip-test',
      sequence: 1,
      passengerId: 'pax-1',
      passengerName: 'Oliver Taylor',
      pickupAddress: 'Oakwood Primary',
      dropoffAddress: '14 Maple Close',
      plannedPickupTime: '15:20',
      plannedDropoffTime: '15:45',
      status: 'unstarted',
      wheelchairRequired: false,
      escortRequired: false,
      safeguardingFlag: false,
    },
    {
      id: 'job-2',
      tripId: 'trip-test',
      sequence: 2,
      passengerId: 'pax-2',
      passengerName: 'Amelia Chen',
      pickupAddress: 'Oakwood Primary',
      dropoffAddress: '8 Birch Avenue',
      plannedPickupTime: '15:35',
      plannedDropoffTime: '15:55',
      status: 'unstarted',
      wheelchairRequired: true,
      escortRequired: true,
      safeguardingFlag: false,
    },
  ],
}

describe('trip-route', () => {
  it('flags unassigned trips', () => {
    expect(tripRouteWarning(baseTrip)).toBe('No driver assigned')
  })

  it('builds ordered stops from jobs', () => {
    const stops = tripStops(baseTrip)
    expect(stops.length).toBeGreaterThan(2)
    expect(stops.some((s) => s.kind === 'pickup')).toBe(true)
    expect(stops.some((s) => s.kind === 'dropoff')).toBe(true)
  })

  it('calculates route metrics', () => {
    const metrics = tripRouteMetrics(baseTrip)
    expect(metrics.stopCount).toBeGreaterThan(0)
    expect(metrics.distanceKm).toBeGreaterThan(0)
    expect(metrics.deadMileageKm).toBeGreaterThan(0)
  })

  it('creates route versions from manifest version', () => {
    const versions = buildTripRouteVersions(baseTrip)
    expect(versions).toHaveLength(2)
    expect(versions[1]?.requiresDriverAck).toBe(true)
  })

  it('maps list row with duty date', () => {
    const row = tripListRow(baseTrip, {
      id: 'duty-3',
      reference: 'SCH-PM-207',
      dutyDate: '2026-07-23',
      startTime: '14:30',
      status: 'unassigned',
      driver: null,
      vehicle: null,
    })
    expect(row.serviceDate).toBe('2026-07-23')
    expect(row.startTime).toBe('15:20')
    expect(row.jobCount).toBe(2)
  })
})
