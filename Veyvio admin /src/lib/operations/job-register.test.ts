import { describe, expect, it } from 'vitest'
import { flattenTripsToJobs } from './job-register'
import type { OperationalTrip } from '@/lib/transfers/types'

describe('job-register', () => {
  it('flattens trip jobs into register rows', () => {
    const trips: OperationalTrip[] = [
      {
        id: 'trip-1',
        reference: 'TRP-001',
        dutyId: null,
        runReference: 'BK-100',
        status: 'assigned',
        driverId: 'd1',
        driverName: 'A. Driver',
        vehicleId: 'v1',
        vehicleRegistration: 'AB12 CDE',
        depotId: null,
        depotName: null,
        assignmentStatus: 'assigned',
        acceptedAt: null,
        acknowledgedAt: null,
        manifestVersion: 1,
        lastAppSync: null,
        delayMinutes: 0,
        passengersOnboard: 0,
        completedJobCount: 0,
        totalJobCount: 1,
        activeJobId: null,
        jobs: [
          {
            id: 'job-1',
            tripId: 'trip-1',
            sequence: 1,
            passengerId: 'p1',
            passengerName: 'Mary Jones',
            pickupAddress: '39 Craven Park',
            dropoffAddress: 'Wembley Hospital',
            plannedPickupTime: '08:10',
            status: 'unstarted',
            wheelchairRequired: true,
            escortRequired: false,
            safeguardingFlag: false,
          },
        ],
        gpsLat: null,
        gpsLng: null,
        driverOnline: false,
        routeName: null,
        bookingId: 'bkg-1',
      },
    ]

    const rows = flattenTripsToJobs(trips)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.passengerName).toBe('Mary Jones')
    expect(rows[0]?.sourceType).toBe('booking')
    expect(rows[0]?.requirements).toContain('Wheelchair')
  })
})
