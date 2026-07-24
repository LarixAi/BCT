import { createDefaultDraft } from '@/lib/bookings/defaults'
import type { BookingPassengerRef, BookingRecord, BookingTrip, BookingType } from '@/lib/bookings/types'

function asBookingType(value: unknown): BookingType {
  const raw = String(value ?? 'one_way')
  if (raw === 'single') return 'one_way'
  if (raw === 'school_route') return 'school'
  if (raw === 'urgent') return 'replacement'
  return raw as BookingType
}

function normalizeTrip(trip: Partial<BookingTrip> & Record<string, unknown>): BookingTrip {
  const stops = Array.isArray(trip.stops)
    ? trip.stops.map((stop, index) => ({
        id: String(stop.id ?? `stop-${index}`),
        sequence: Number(stop.sequence ?? index + 1),
        type: stop.type ?? 'pickup',
        name: String(stop.name ?? 'Stop'),
        address: String(stop.address ?? ''),
        passengerId: stop.passengerId ?? null,
        scheduledTime: stop.scheduledTime ?? null,
      }))
    : []

  return {
    id: String(trip.id ?? `trip-${indexSafe()}`),
    label: String(trip.label ?? 'Outbound'),
    direction: trip.direction,
    pickupDate: String(trip.pickupDate ?? new Date().toISOString().slice(0, 10)),
    schedulingMode: trip.schedulingMode ?? 'pickup_led',
    requestedPickupTime: trip.requestedPickupTime ?? null,
    requiredArrivalTime: trip.requiredArrivalTime ?? null,
    calculatedPickupTime: trip.calculatedPickupTime ?? null,
    calculatedArrivalTime: trip.calculatedArrivalTime ?? null,
    stops,
    status: trip.status ?? 'planned',
  }
}

let tripUid = 0
function indexSafe() {
  tripUid += 1
  return tripUid
}

function normalizePassenger(passenger: Partial<BookingPassengerRef> & Record<string, unknown>): BookingPassengerRef {
  return {
    passengerId: String(passenger.passengerId ?? passenger.passenger_id ?? passenger.id ?? ''),
    firstName: String(passenger.firstName ?? passenger.first_name ?? 'Passenger'),
    lastName: String(passenger.lastName ?? passenger.last_name ?? ''),
    requirements: Array.isArray(passenger.requirements)
      ? passenger.requirements.map(String)
      : [],
    safeguardingFlag: Boolean(passenger.safeguardingFlag ?? passenger.safeguarding_flag),
  }
}

/** Ensures booking detail payloads always include wizard-shaped arrays and defaults. */
export function normalizeBookingRecord(raw: Record<string, unknown>): BookingRecord {
  const bookingType = asBookingType(raw.bookingType ?? raw.booking_type)
  const defaults = createDefaultDraft(bookingType)
  const trips = Array.isArray(raw.trips) ? raw.trips.map(t => normalizeTrip(t as BookingTrip)) : []
  const passengers = Array.isArray(raw.passengers)
    ? raw.passengers.map(p => normalizePassenger(p as BookingPassengerRef))
    : []

  return {
    ...defaults,
    ...raw,
    id: String(raw.id ?? ''),
    reference: String(raw.reference ?? raw.bookingReference ?? '—'),
    bookingType,
    status: (raw.status as BookingRecord['status']) ?? defaults.status,
    customerId: raw.customerId != null ? String(raw.customerId) : raw.customer_id != null ? String(raw.customer_id) : null,
    customerName: raw.customerName != null
      ? String(raw.customerName)
      : raw.customer_name != null
        ? String(raw.customer_name)
        : null,
    passengers,
    trips: trips.length ? trips : defaults.trips,
    requirements: { ...defaults.requirements, ...(raw.requirements as object | undefined) },
    recurrence: { ...defaults.recurrence, ...(raw.recurrence as object | undefined) },
    pricing: { ...defaults.pricing, ...(raw.pricing as object | undefined) },
    dispatch: { ...defaults.dispatch, ...(raw.dispatch as object | undefined) },
    schedulingStatus: String(raw.schedulingStatus ?? 'unscheduled'),
    billingStatus: String(raw.billingStatus ?? 'not_billed'),
    depotName: raw.depotName != null ? String(raw.depotName) : raw.depot_name != null ? String(raw.depot_name) : null,
    warningCount: Number(raw.warningCount ?? 0),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? new Date().toISOString()),
  }
}
