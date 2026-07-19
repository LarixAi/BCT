import { describe, expect, it } from 'vitest'
import { mockTransfersApi } from '@/lib/api/mock-transfers'
import {
  buildSequenceStops,
  buildWorkspace,
  findLinkedReturn,
  inferLegDirection,
  toClockTime,
} from './build-sequence'

describe('build-sequence', () => {
  it('normalises ISO pickup times so depot clocks are not NaN:NaN', () => {
    expect(toClockTime('2026-07-19T06:10:00+00:00')).toBe('06:10')
    const trip = mockTransfersApi.getTrip('trip-1058')
    const isoTrip = {
      ...trip,
      jobs: trip.jobs.map((job, i) =>
        i === 0
          ? { ...job, plannedPickupTime: '2026-07-19T06:10:00+00:00', plannedDropoffTime: '2026-07-19T07:05:00+00:00' }
          : job,
      ),
    }
    const stops = buildSequenceStops(isoTrip)
    const firstPickup = stops.find((s) => s.kind === 'pickup')
    expect(firstPickup?.plannedTime).toBe('06:10')
    expect(firstPickup?.plannedTime).not.toContain('NaN')
    const drop = stops.find((s) => s.kind === 'dropoff')
    expect(drop?.plannedTime).toBe('07:05')
  })

  it('builds depot → pickups → shared drop → depot return', () => {
    const trip = mockTransfersApi.getTrip('trip-1058')
    const ws = buildWorkspace(trip, mockTransfersApi.listTrips())
    expect(ws.stops[0]?.kind).toBe('depot_depart')
    expect(ws.stops.at(-1)?.kind).toBe('depot_return')
    const pickups = ws.stops.filter((s) => s.kind === 'pickup')
    const dropoffs = ws.stops.filter((s) => s.kind === 'dropoff')
    expect(pickups.length).toBe(trip.jobs.length)
    // Shared community/school destination collapses to one drop-off stop
    expect(dropoffs.length).toBe(1)
  })

  it('links outbound morning job to afternoon return', () => {
    const outbound = mockTransfersApi.getTrip('trip-1041')
    const job = outbound.jobs.find((j) => j.passengerName === 'Oliver Taylor')!
    expect(inferLegDirection(job)).toBe('outbound')
    const linked = findLinkedReturn(outbound, job, mockTransfersApi.listTrips())
    expect(linked?.direction).toBe('return')
    expect(linked?.passengerName).toBe('Oliver Taylor')
    expect(linked?.tripId).toBe('trip-1072')
  })
})
