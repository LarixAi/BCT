import { describe, expect, it } from 'vitest'
import { createDefaultDraft } from '@/lib/bookings/defaults'
import {
  applyJourneyStructure,
  bookingTypeToStructure,
  buildJobPreview,
  countJobsToGenerate,
  structureToBookingType,
} from '@/lib/bookings/booking-journey-utils'

describe('booking-journey-utils', () => {
  it('maps structure to booking type', () => {
    expect(structureToBookingType('one_way', false)).toBe('one_way')
    expect(structureToBookingType('return', false)).toBe('return')
    expect(structureToBookingType('one_way', true)).toBe('recurring')
  })

  it('maps booking type back to structure', () => {
    expect(bookingTypeToStructure('return')).toBe('return')
    expect(bookingTypeToStructure('recurring')).toBe('one_way')
  })

  it('applies return structure with two trips', () => {
    const draft = createDefaultDraft('one_way')
    const patch = applyJourneyStructure(draft, 'return', false)
    expect(patch.bookingType).toBe('return')
    expect(patch.trips).toHaveLength(2)
    expect(patch.trips?.[1]?.direction).toBe('return')
  })

  it('builds job preview per passenger per trip', () => {
    const draft = createDefaultDraft('one_way')
    draft.passengers = [
      { passengerId: 'p1', firstName: 'Oliver', lastName: 'Taylor', requirements: [] },
      { passengerId: 'p2', firstName: 'Mia', lastName: 'Taylor', requirements: [] },
    ]
    draft.trips[0]!.stops[0]!.address = '12 Oak Street'
    draft.trips[0]!.stops[1]!.address = 'Oakwood School'

    const jobs = buildJobPreview(draft)
    expect(jobs).toHaveLength(2)
    expect(countJobsToGenerate(draft)).toBe(2)
    expect(jobs[0]?.route).toContain('12 Oak Street')
  })
})
