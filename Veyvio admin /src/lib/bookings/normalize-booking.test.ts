import { describe, expect, it } from 'vitest'
import { normalizeBookingRecord } from './normalize-booking'

describe('normalizeBookingRecord', () => {
  it('fills missing trips and passengers from raw booking rows', () => {
    const booking = normalizeBookingRecord({
      id: 'dc8ac11d-0896-47fe-9550-eaaa19a7f995',
      bookingReference: 'BKG-00042',
      bookingType: 'single',
      status: 'confirmed',
      customerName: 'Oakwood Primary',
    })

    expect(booking.reference).toBe('BKG-00042')
    expect(booking.bookingType).toBe('one_way')
    expect(Array.isArray(booking.trips)).toBe(true)
    expect(booking.trips.length).toBeGreaterThan(0)
    expect(Array.isArray(booking.passengers)).toBe(true)
    expect(booking.trips[0]?.stops.length).toBeGreaterThan(0)
  })
})
