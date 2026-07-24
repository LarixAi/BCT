import { describe, expect, it } from 'vitest'
import {
  bookingTypeFromSlug,
  bookingTypeToSlug,
  bookingWizardPath,
  VALID_BOOKING_TYPE_SLUGS,
} from './booking-type-routes'

describe('booking-type-routes', () => {
  it('maps booking types to URL slugs', () => {
    expect(bookingTypeToSlug('one_way')).toBe('one-way')
    expect(bookingTypeToSlug('multi_stop')).toBe('multi-stop')
    expect(bookingTypeToSlug('replacement')).toBe('emergency')
  })

  it('parses slugs back to booking types', () => {
    expect(bookingTypeFromSlug('contract')).toBe('contract')
    expect(bookingTypeFromSlug('one-way')).toBe('one_way')
    expect(bookingTypeFromSlug('unknown')).toBeNull()
  })

  it('builds wizard paths', () => {
    expect(bookingWizardPath('contract')).toBe('/bookings/new/contract')
  })

  it('covers every booking type slug', () => {
    expect(VALID_BOOKING_TYPE_SLUGS).toContain('contract')
    expect(VALID_BOOKING_TYPE_SLUGS).toHaveLength(10)
  })
})
