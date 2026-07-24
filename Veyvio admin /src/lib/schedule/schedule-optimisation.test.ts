import { describe, expect, it } from 'vitest'
import { buildScheduleOptimisations } from './schedule-optimisation'
import type { PlanningJob } from './planning-types'
import type { OperationalTrip } from '@/lib/transfers/types'

const job = (partial: Partial<PlanningJob> & Pick<PlanningJob, 'jobId'>): PlanningJob => ({
  tripId: 'trip-u',
  tripReference: 'TRP-U',
  reference: partial.jobId,
  passengerName: 'Passenger',
  pickupAddress: 'A',
  dropoffAddress: 'Oakwood Primary',
  journey: 'A → Oakwood Primary',
  requiredTime: '07:40',
  sourceType: 'school_route',
  sourceLabel: 'School Route',
  requirements: [],
  priority: 'normal',
  estimatedDurationMinutes: 20,
  status: 'unstarted',
  dutyId: null,
  runReference: null,
  ...partial,
})

const trip: OperationalTrip = {
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
  manifestVersion: 1,
  lastAppSync: null,
  delayMinutes: 0,
  passengersOnboard: 0,
  completedJobCount: 0,
  totalJobCount: 2,
  activeJobId: null,
  routeName: 'School AM',
  gpsLat: null,
  gpsLng: null,
  driverOnline: false,
  jobs: [
    {
      id: 'j2',
      tripId: 'trip-1',
      sequence: 2,
      passengerId: 'p2',
      passengerName: 'B',
      pickupAddress: 'B',
      dropoffAddress: 'School',
      plannedPickupTime: '08:00',
      status: 'unstarted',
      wheelchairRequired: false,
      escortRequired: false,
      safeguardingFlag: false,
    },
    {
      id: 'j1',
      tripId: 'trip-1',
      sequence: 1,
      passengerId: 'p1',
      passengerName: 'A',
      pickupAddress: 'A',
      dropoffAddress: 'School',
      plannedPickupTime: '07:30',
      status: 'unstarted',
      wheelchairRequired: false,
      escortRequired: false,
      safeguardingFlag: false,
    },
  ],
}

describe('schedule-optimisation', () => {
  it('suggests grouping jobs with shared destination', () => {
    const jobs = [
      job({ jobId: 'a', requiredTime: '07:35' }),
      job({ jobId: 'b', requiredTime: '07:50', passengerName: 'Other' }),
    ]
    const suggestions = buildScheduleOptimisations({
      unscheduledJobs: jobs,
      checkedJobIds: ['a', 'b'],
      activeTrip: null,
      duties: [],
      trips: [],
      drivers: [],
      vehicles: [],
    })
    expect(suggestions.some((s) => s.category === 'grouping')).toBe(true)
  })

  it('flags stop order when pickups are out of sequence', () => {
    const suggestions = buildScheduleOptimisations({
      unscheduledJobs: [],
      checkedJobIds: [],
      activeTrip: trip,
      duties: [],
      trips: [trip],
      drivers: [],
      vehicles: [],
    })
    expect(suggestions.some((s) => s.category === 'stop_order')).toBe(true)
  })
})
