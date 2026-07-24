import { describe, expect, it } from 'vitest'
import { buildOperationalTrail, buildTrailFromTrip, sourceHref } from './operational-trail'
import type { OperationalTrip } from '@/lib/transfers/types'

const trip: OperationalTrip = {
  id: 'trip-1041',
  reference: 'TRP-1041',
  dutyId: 'duty-1',
  runReference: 'SCH-AM-104',
  bookingId: 'bkg-101',
  bookingReference: 'BK-2026-0101',
  status: 'in_progress',
  driverId: 'drv-1',
  driverName: 'Jane Smith',
  vehicleId: 'veh-1',
  vehicleRegistration: 'AB12 CDE',
  depotId: null,
  depotName: null,
  assignmentStatus: 'acknowledged',
  acceptedAt: null,
  acknowledgedAt: new Date().toISOString(),
  manifestVersion: 1,
  lastAppSync: null,
  delayMinutes: 0,
  passengersOnboard: 1,
  completedJobCount: 1,
  totalJobCount: 2,
  activeJobId: 'job-1',
  routeName: 'Oakwood School AM',
  gpsLat: null,
  gpsLng: null,
  driverOnline: true,
  jobs: [
    {
      id: 'job-1',
      tripId: 'trip-1041',
      sequence: 1,
      passengerId: 'pax-1',
      passengerName: 'Oliver Taylor',
      pickupAddress: 'A',
      dropoffAddress: 'B',
      plannedPickupTime: '07:40',
      status: 'onboard',
      wheelchairRequired: false,
      escortRequired: false,
      safeguardingFlag: false,
    },
  ],
}

describe('operational-trail', () => {
  it('builds source href by type', () => {
    expect(sourceHref('booking', 'bkg-1')).toBe('/bookings/bkg-1')
    expect(sourceHref('dial_a_ride', 'dar-1')).toBe('/dial-a-ride/requests/dar-1')
    expect(sourceHref('school_route', 'sch-1')).toBe('/school-routes/sch-1')
  })

  it('builds trail from trip with run and dispatch links', () => {
    const trail = buildTrailFromTrip(trip)
    expect(trail.find((s) => s.id === 'trip')?.href).toBe('/trips/trip-1041')
    expect(trail.find((s) => s.id === 'run')?.href).toBe('/runs/duty-1')
    expect(trail.find((s) => s.id === 'live')?.href).toBe('/dispatch?duty=duty-1')
  })

  it('marks missing trip as pending', () => {
    const trail = buildOperationalTrail({ current: 'job' })
    expect(trail.find((s) => s.id === 'trip')?.status).toBe('pending')
  })
})
