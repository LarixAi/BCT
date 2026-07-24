import { describe, expect, it } from 'vitest'
import { validatePlanningAssignment } from '@/lib/schedule/assignment-validation'
import { mockDriversApi } from '@/lib/api/mock-drivers'
import { mockVehiclesApi } from '@/lib/api/mock-vehicles'
import type { DutyRecord } from '@/lib/api/types'
import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'

const baseTrip: OperationalTrip = {
  id: 'trip-1',
  reference: 'TRP-1',
  dutyId: 'duty-1',
  runReference: 'RUN-1',
  status: 'planned',
  driverId: null,
  driverName: null,
  vehicleId: null,
  vehicleRegistration: null,
  depotId: 'depot-1',
  depotName: 'Wembley',
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
  jobs: [],
  gpsLat: null,
  gpsLng: null,
  driverOnline: false,
  routeName: 'School PM',
}

const baseJob: OperationalJob = {
  id: 'job-1',
  tripId: 'trip-1',
  sequence: 1,
  passengerId: 'pax-1',
  passengerName: 'Test Passenger',
  pickupAddress: 'A',
  dropoffAddress: 'B',
  plannedPickupTime: '15:00',
  status: 'unstarted',
  wheelchairRequired: false,
  escortRequired: false,
  safeguardingFlag: false,
}

const driver = mockDriversApi.list().find((d) => d.id === 'drv-1')!
const vehicle = mockVehiclesApi.list().find((v) => v.id === 'veh-1')!

describe('validatePlanningAssignment', () => {
  it('blocks when driver and vehicle are missing', () => {
    const result = validatePlanningAssignment({
      trip: baseTrip,
      jobs: [baseJob],
      driver: null,
      vehicle: null,
      duties: [],
      dutyDate: '2026-07-23',
    })
    expect(result.level).toBe('blocked')
    expect(result.canAssign).toBe(false)
    expect(result.items.some((i) => i.id === 'no-driver')).toBe(true)
    expect(result.items.some((i) => i.id === 'no-vehicle')).toBe(true)
  })

  it('is compatible with valid driver and vehicle', () => {
    const result = validatePlanningAssignment({
      trip: baseTrip,
      jobs: [baseJob],
      driver,
      vehicle,
      duties: [],
      dutyDate: '2026-07-23',
    })
    expect(['compatible', 'warning']).toContain(result.level)
    expect(result.canAssign).toBe(true)
    expect(result.canPublish).toBe(true)
  })

  it('blocks VOR vehicle', () => {
    const vorVehicle = mockVehiclesApi.list().find((v) => v.operationalStatus === 'vor')
      ?? { ...vehicle, operationalStatus: 'vor' as const }
    const result = validatePlanningAssignment({
      trip: baseTrip,
      jobs: [baseJob],
      driver,
      vehicle: vorVehicle,
      duties: [],
      dutyDate: '2026-07-23',
    })
    expect(result.level).toBe('blocked')
    expect(result.canPublish).toBe(false)
  })

  it('warns on driver double booking', () => {
    const duties: DutyRecord[] = [
      {
        id: 'duty-other',
        reference: 'OTHER',
        dutyDate: '2026-07-23',
        startTime: '08:00',
        status: 'assigned',
        driver: { id: 'drv-1', firstName: 'Jane', lastName: 'Smith' },
        vehicle: { id: 'veh-9', registrationNumber: 'ZZ99 ZZZ' },
      },
    ]
    const result = validatePlanningAssignment({
      trip: baseTrip,
      jobs: [baseJob],
      driver,
      vehicle,
      duties,
      dutyDate: '2026-07-23',
    })
    expect(result.level).toBe('warning')
    expect(result.items.some((i) => i.id === 'driver-double-booked')).toBe(true)
    expect(result.canAssign).toBe(true)
  })
})
