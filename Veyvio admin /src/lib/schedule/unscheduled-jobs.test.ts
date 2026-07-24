import { describe, expect, it } from 'vitest'
import { listUnscheduledPlanningJobs } from '@/lib/schedule/unscheduled-jobs'
import type { OperationalTrip } from '@/lib/transfers/types'

describe('listUnscheduledPlanningJobs', () => {
  it('includes unstarted jobs on unassigned trips', () => {
    const trips: OperationalTrip[] = [
      {
        id: 'trip-1',
        reference: 'TRP-1',
        dutyId: 'duty-1',
        runReference: 'RUN-1',
        status: 'planned',
        driverId: null,
        driverName: null,
        vehicleId: null,
        vehicleRegistration: null,
        depotId: null,
        depotName: null,
        assignmentStatus: 'unassigned',
        acceptedAt: null,
        acknowledgedAt: null,
        manifestVersion: 0,
        lastAppSync: null,
        delayMinutes: 0,
        passengersOnboard: 0,
        completedJobCount: 0,
        totalJobCount: 1,
        activeJobId: null,
        routeName: 'Dial-a-Ride',
        gpsLat: null,
        gpsLng: null,
        driverOnline: false,
        jobs: [
          {
            id: 'job-1',
            tripId: 'trip-1',
            sequence: 1,
            passengerId: 'pax-1',
            passengerName: 'Mary Jones',
            pickupAddress: '1 High St',
            dropoffAddress: 'Clinic',
            plannedPickupTime: '10:30',
            status: 'unstarted',
            wheelchairRequired: true,
            escortRequired: false,
            safeguardingFlag: false,
          },
        ],
      },
    ]

    const jobs = listUnscheduledPlanningJobs(trips)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.passengerName).toBe('Mary Jones')
    expect(jobs[0]?.sourceType).toBe('dial_a_ride')
    expect(jobs[0]?.requirements).toContain('Wheelchair')
  })

  it('excludes completed jobs even when trip is unassigned', () => {
    const trips: OperationalTrip[] = [
      {
        id: 'trip-1',
        reference: 'TRP-1',
        dutyId: null,
        runReference: null,
        status: 'planned',
        driverId: null,
        driverName: null,
        vehicleId: null,
        vehicleRegistration: null,
        depotId: null,
        depotName: null,
        assignmentStatus: 'unassigned',
        acceptedAt: null,
        acknowledgedAt: null,
        manifestVersion: 0,
        lastAppSync: null,
        delayMinutes: 0,
        passengersOnboard: 0,
        completedJobCount: 1,
        totalJobCount: 1,
        activeJobId: null,
        routeName: 'Booking',
        gpsLat: null,
        gpsLng: null,
        driverOnline: false,
        jobs: [
          {
            id: 'job-1',
            tripId: 'trip-1',
            sequence: 1,
            passengerId: 'pax-1',
            passengerName: 'Done',
            pickupAddress: 'A',
            dropoffAddress: 'B',
            plannedPickupTime: '09:00',
            status: 'completed',
            wheelchairRequired: false,
            escortRequired: false,
            safeguardingFlag: false,
          },
        ],
      },
    ]

    expect(listUnscheduledPlanningJobs(trips)).toHaveLength(0)
  })
})
