import { describe, expect, it } from 'vitest'
import {
  listActiveRuns,
  listLateJobs,
  listUrgentUnassignedJobs,
} from '@/lib/dispatch/dispatch-board'
import type { DutyRecord } from '@/lib/api/types'
import type { OperationalTrip } from '@/lib/transfers/types'

const duty: DutyRecord = {
  id: 'duty-1',
  reference: 'SCH-AM-104',
  dutyDate: '2026-07-23',
  startTime: '07:30',
  endTime: '09:30',
  status: 'in_progress',
  driver: { id: 'drv-1', firstName: 'Jane', lastName: 'Smith' },
  vehicle: { id: 'veh-1', registrationNumber: 'AB12 CDE' },
  route: { id: 'route-1', name: 'Oakwood School AM' },
}

const lateTrip: OperationalTrip = {
  id: 'trip-1',
  reference: 'TRP-1041',
  dutyId: 'duty-1',
  runReference: 'SCH-AM-104',
  status: 'in_progress',
  driverId: 'drv-1',
  driverName: 'Jane Smith',
  vehicleId: 'veh-1',
  vehicleRegistration: 'AB12 CDE',
  depotId: null,
  depotName: null,
  assignmentStatus: 'acknowledged',
  acceptedAt: null,
  acknowledgedAt: null,
  manifestVersion: 1,
  lastAppSync: null,
  delayMinutes: 25,
  passengersOnboard: 1,
  completedJobCount: 1,
  totalJobCount: 2,
  activeJobId: 'job-1',
  jobs: [
    {
      id: 'job-1',
      tripId: 'trip-1',
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
  gpsLat: null,
  gpsLng: null,
  driverOnline: true,
  routeName: 'School AM',
}

const unassignedTrip: OperationalTrip = {
  ...lateTrip,
  id: 'trip-1072',
  reference: 'TRP-1072',
  dutyId: 'duty-3',
  delayMinutes: 0,
  driverId: null,
  driverName: null,
  vehicleId: null,
  vehicleRegistration: null,
  assignmentStatus: 'unassigned',
  jobs: [
    {
      id: 'job-u1',
      tripId: 'trip-1072',
      sequence: 1,
      passengerId: 'pax-2',
      passengerName: 'Emily Watson',
      pickupAddress: 'School',
      dropoffAddress: 'Home',
      plannedPickupTime: '15:20',
      status: 'unstarted',
      wheelchairRequired: false,
      escortRequired: false,
      safeguardingFlag: true,
    },
  ],
}

describe('dispatch-board', () => {
  it('lists active runs', () => {
    const runs = listActiveRuns([duty])
    expect(runs).toHaveLength(1)
    expect(runs[0]?.reference).toBe('SCH-AM-104')
  })

  it('lists late jobs from delayed trips', () => {
    const late = listLateJobs([lateTrip])
    expect(late).toHaveLength(1)
    expect(late[0]?.delayMinutes).toBe(25)
  })

  it('lists urgent unassigned jobs', () => {
    const urgent = listUrgentUnassignedJobs([unassignedTrip])
    expect(urgent).toHaveLength(1)
    expect(urgent[0]?.reason).toContain('Safeguarding')
  })
})
