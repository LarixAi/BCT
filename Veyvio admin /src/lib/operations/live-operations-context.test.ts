import { describe, expect, it } from 'vitest'
import {
  driverAcknowledgementState,
  hasPendingRouteRevision,
} from './live-operations-context'
import type { OperationalTrip } from '@/lib/transfers/types'

const pendingTrip: OperationalTrip = {
  id: 'trip-1058',
  reference: 'TRP-1058',
  dutyId: 'duty-2',
  runReference: 'DAY-024',
  status: 'assigned',
  driverId: 'drv-2',
  driverName: 'Michael Patel',
  vehicleId: 'veh-2',
  vehicleRegistration: 'GH56 HIJ',
  depotId: null,
  depotName: null,
  assignmentStatus: 'accepted',
  acceptedAt: new Date().toISOString(),
  acknowledgedAt: null,
  manifestVersion: 2,
  lastAppSync: null,
  delayMinutes: 0,
  passengersOnboard: 0,
  completedJobCount: 0,
  totalJobCount: 1,
  activeJobId: null,
  routeName: 'Day Centre Run',
  gpsLat: null,
  gpsLng: null,
  driverOnline: true,
  jobs: [],
}

describe('live-operations-context', () => {
  it('detects pending driver acknowledgement', () => {
    expect(driverAcknowledgementState(pendingTrip)).toBe('pending')
  })

  it('flags route revision when manifest changed without ack', () => {
    expect(hasPendingRouteRevision(pendingTrip)).toBe(true)
  })
})
