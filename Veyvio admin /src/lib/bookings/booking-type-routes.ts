import type { BookingType } from '@/lib/bookings/types'

/** URL slug for each booking type (path segment under /bookings/new/) */
export const BOOKING_TYPE_SLUGS: Record<BookingType, string> = {
  one_way: 'one-way',
  return: 'return',
  multi_stop: 'multi-stop',
  recurring: 'recurring',
  school: 'school',
  contract: 'contract',
  group: 'group',
  accessible: 'accessible',
  staff: 'staff',
  replacement: 'emergency',
}

const SLUG_TO_TYPE = Object.fromEntries(
  Object.entries(BOOKING_TYPE_SLUGS).map(([type, slug]) => [slug, type]),
) as Record<string, BookingType>

export const VALID_BOOKING_TYPE_SLUGS = Object.values(BOOKING_TYPE_SLUGS)

export function bookingTypeToSlug(type: BookingType): string {
  return BOOKING_TYPE_SLUGS[type]
}

export function bookingTypeFromSlug(slug: string | undefined): BookingType | null {
  if (!slug) return null
  return SLUG_TO_TYPE[slug] ?? null
}

export function bookingWizardPath(type: BookingType): string {
  return `/bookings/new/${bookingTypeToSlug(type)}`
}
