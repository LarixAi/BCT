import { createEmptyTrip } from '@/lib/bookings/defaults'
import type { BookingDraft, BookingType, FundingType } from '@/lib/bookings/types'

export type JourneyStructure = 'one_way' | 'return' | 'multi_stop' | 'group'

export const JOURNEY_STRUCTURE_OPTIONS: {
  id: JourneyStructure
  label: string
  description: string
}[] = [
  { id: 'one_way', label: 'One-way', description: 'Single journey from pickup to destination' },
  { id: 'return', label: 'Return', description: 'Outbound and return legs' },
  { id: 'multi_stop', label: 'Multi-stop', description: 'Several pickups or drop-offs on one journey' },
  { id: 'group', label: 'Group transport', description: 'Multiple passengers travelling together' },
]

export const SERVICE_PURPOSE_OPTIONS = [
  { id: 'community', label: 'Community transport' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'day_centre', label: 'Day centre' },
  { id: 'staff', label: 'Staff transport' },
  { id: 'group_outing', label: 'Group outing' },
  { id: 'event', label: 'Event transport' },
  { id: 'airport', label: 'Airport transfer' },
  { id: 'replacement', label: 'Replacement transport' },
  { id: 'other', label: 'Other' },
] as const

export const FUNDING_TYPE_OPTIONS = [
  { id: 'private', label: 'Private payment' },
  { id: 'customer_account', label: 'Customer account' },
  { id: 'contract', label: 'Contract-funded' },
  { id: 'local_authority', label: 'Local authority' },
  { id: 'nhs', label: 'NHS or healthcare' },
  { id: 'internal', label: 'Internal' },
  { id: 'other', label: 'Other' },
] as const

export type { FundingType }

export const RECURRENCE_PATTERN_OPTIONS = [
  { id: 'none', label: 'No' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom' },
] as const

export type RecurrencePattern = (typeof RECURRENCE_PATTERN_OPTIONS)[number]['id']

export function structureToBookingType(
  structure: JourneyStructure,
  recurring: boolean,
): BookingType {
  if (recurring) return 'recurring'
  return structure
}

export function bookingTypeToStructure(type: BookingType): JourneyStructure {
  if (type === 'return') return 'return'
  if (type === 'multi_stop') return 'multi_stop'
  if (type === 'group') return 'group'
  return 'one_way'
}

export function applyJourneyStructure(
  draft: BookingDraft,
  structure: JourneyStructure,
  recurring: boolean,
): Partial<BookingDraft> {
  const bookingType = structureToBookingType(structure, recurring)
  const date = draft.trips[0]?.pickupDate ?? new Date().toISOString().slice(0, 10)
  const trips = [createEmptyTrip(date, structure === 'return' ? 'Outbound' : 'Journey')]
  if (structure === 'return') {
    trips.push({
      ...createEmptyTrip(date, 'Return'),
      direction: 'return',
      label: 'Return',
    })
  }

  const recurrence = { ...draft.recurrence }
  if (recurring) {
    recurrence.enabled = true
    if (!recurrence.startDate) recurrence.startDate = date
    if (!recurrence.daysOfWeek.length) recurrence.daysOfWeek = ['mon', 'tue', 'wed', 'thu', 'fri']
  } else {
    recurrence.enabled = false
  }

  return { bookingType, trips, recurrence }
}

export type JobPreviewItem = {
  id: string
  label: string
  passenger: string
  route: string
  time: string
}

export function buildJobPreview(draft: BookingDraft): JobPreviewItem[] {
  const passengers =
    draft.passengers.length > 0
      ? draft.passengers.map((p) => `${p.firstName} ${p.lastName}`.trim())
      : ['Passenger to be confirmed']

  const items: JobPreviewItem[] = []
  draft.trips.forEach((trip) => {
    const pickup = trip.stops.find((s) => s.type === 'pickup')
    const dropoff = trip.stops.find((s) => s.type === 'dropoff')
    const route = `${pickup?.address || 'Pickup TBC'} → ${dropoff?.address || 'Destination TBC'}`
    const time =
      trip.schedulingMode === 'arrival_led'
        ? `Arrive ${trip.requiredArrivalTime ?? 'TBC'}`
        : `Pickup ${trip.requestedPickupTime ?? trip.calculatedPickupTime ?? 'TBC'}`

    passengers.forEach((passenger, index) => {
      items.push({
        id: `${trip.id}-${index}`,
        label: `JOB ${items.length + 1} — ${trip.label}`,
        passenger,
        route,
        time,
      })
    })
  })
  return items
}

export function countJobsToGenerate(draft: BookingDraft): number {
  return buildJobPreview(draft).length
}
