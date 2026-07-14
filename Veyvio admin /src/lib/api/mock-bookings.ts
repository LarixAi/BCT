import type {
  BookingDraft,
  BookingListItem,
  BookingRecord,
  CustomerBookingContext,
  CreateDraftOptions,
  CancelBookingInput,
  AutoPlanProposal,
  EditImpact,
} from '@/lib/bookings/types'
import { bookingReference, createDefaultDraft, createEmptyTrip } from '@/lib/bookings/defaults'
import { estimatePricing, validateBooking, hasBlockingErrors } from '@/lib/bookings/validation'
import { generateAutoPlanProposal } from '@/lib/bookings/auto-plan'
import { calculateEditImpact } from '@/lib/bookings/edit-impact'
import type { DriverProfile } from '@/lib/drivers/types'
import type { DutyDetailRecord, PassengerRecord } from './types'
import { enrichPassenger } from '@/lib/bookings/passenger'
import { mockTransfersApi } from './mock-transfers'

let bookingSeq = 1042
const drafts = new Map<string, BookingDraft>()

const CUSTOMER_CONTEXT: Record<string, CustomerBookingContext> = {
  'cust-1': {
    id: 'cust-1',
    name: 'Oakwood Primary',
    customerType: 'school',
    accountStatus: 'active',
    billingArrangement: 'Monthly invoice',
    creditStatus: 'good',
    activeContracts: [{ id: 'con-1', name: 'Oakwood Primary 2025/26', ref: 'OAK-2025-26' }],
    pricingRules: ['School contract — per mile', 'Term-time discount applied'],
    poRequired: false,
    contacts: [{ name: 'Sarah Mitchell', role: 'Transport coordinator', email: 'transport@oakwood.sch.uk' }],
    previousBookingCount: 12,
    outstandingIssues: [],
    contractRules: {
      wheelchairAllowed: true,
      invoiceTerms: '30 days',
      passengerAssistantIncluded: true,
      cancellationRules: 'Contract Schedule B — 24h notice',
    },
  },
  'cust-2': {
    id: 'cust-2',
    name: 'Riverside Day Centre',
    customerType: 'nhs_care',
    accountStatus: 'active',
    billingArrangement: 'Contract consolidated',
    creditStatus: 'good',
    activeContracts: [{ id: 'con-2', name: 'Riverside Day Centre', ref: 'RDC-2025' }],
    pricingRules: ['Adult social care — hourly'],
    poRequired: true,
    contacts: [{ name: 'James Okonkwo', role: 'Operations', email: 'ops@riverside-care.nhs.uk' }],
    previousBookingCount: 8,
    outstandingIssues: ['PO pending for February invoice'],
    contractRules: {
      wheelchairAllowed: true,
      invoiceTerms: '30 days',
      passengerAssistantIncluded: true,
      cancellationRules: '48h notice for non-urgent cancellations',
    },
  },
}

let mockBookings: BookingRecord[] = [
  {
    ...createDefaultDraft('school'),
    id: 'bkg-1001',
    reference: 'BKG-01001',
    status: 'confirmed',
    customerId: 'cust-1',
    customerName: 'Oakwood Primary',
    passengers: [
      {
        passengerId: 'pax-1',
        firstName: 'Oliver',
        lastName: 'Taylor',
        requirements: ['Booster seat', 'Parent handover required'],
      },
    ],
    trips: [
      {
        id: 'trip-1',
        label: 'Morning outbound',
        direction: 'outbound',
        pickupDate: new Date().toISOString().slice(0, 10),
        schedulingMode: 'arrival_led',
        requiredArrivalTime: '08:30',
        calculatedPickupTime: '07:40',
        calculatedArrivalTime: '08:30',
        requestedPickupTime: null,
        stops: [
          { id: 's1', sequence: 1, type: 'pickup', name: 'Home', address: '12 Station Road, London', scheduledTime: '07:40' },
          { id: 's2', sequence: 2, type: 'dropoff', name: 'School', address: 'Oakwood Primary School', scheduledTime: '08:30' },
        ],
        status: 'unassigned',
      },
    ],
    pricing: {
      baseFare: 0,
      distanceCharge: 0,
      supplements: 0,
      totalPrice: 0,
      estimatedCost: 54.2,
      margin: 23.8,
      marginPct: 30.5,
      contractRef: 'OAK-2025-26',
      billingNote: 'Covered by OAK-2025-26',
      poRequired: false,
      poNumber: null,
      priceOverride: null,
      overrideReason: null,
    },
    dispatch: { mode: 'send_to_dispatch', depotId: 'depot-wembley', driverId: null, vehicleId: null, assistantId: null },
    schedulingStatus: 'unscheduled',
    billingStatus: 'contract',
    depotName: 'Wembley Depot',
    warningCount: 0,
    ownerName: 'Karen Mitchell',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    ...createDefaultDraft('accessible'),
    id: 'bkg-1002',
    reference: 'BKG-01002',
    status: 'draft',
    customerId: 'cust-2',
    customerName: 'Riverside Day Centre',
    passengers: [
      {
        passengerId: 'pax-3',
        firstName: 'George',
        lastName: 'Williams',
        requirements: ['Wheelchair', 'Passenger assistant', 'Safeguarding — authorised handover only'],
        safeguardingFlag: true,
      },
    ],
    schedulingStatus: '—',
    billingStatus: 'pending',
    depotName: null,
    warningCount: 1,
    ownerName: 'Larone Laing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function toListItem(b: BookingRecord): BookingListItem {
  return {
    id: b.id,
    reference: b.reference,
    customerName: b.customerName ?? '—',
    passengerSummary:
      b.passengers.length === 0
        ? '—'
        : b.passengers.length === 1
          ? `${b.passengers[0]!.firstName} ${b.passengers[0]!.lastName}`
          : `${b.passengers.length} passengers`,
    bookingType: b.bookingType,
    firstJourneyDate: b.trips[0]?.pickupDate ?? '—',
    tripCount: b.trips.length,
    serviceRequirement: b.requirements.wheelchairAccessible
      ? 'Accessible vehicle'
      : b.requirements.passengerAssistant
        ? 'PA required'
        : 'Standard',
    status: b.status,
    schedulingStatus: b.schedulingStatus,
    billingStatus: b.billingStatus,
    depotName: b.depotName,
    warningCount: b.warningCount,
    owner: b.ownerName ?? null,
  }
}

export const mockBookingsApi = {
  list(params?: { view?: string }): BookingListItem[] {
    let list = mockBookings.map(toListItem)
    const today = new Date().toISOString().slice(0, 10)
    switch (params?.view) {
      case 'draft':
        list = list.filter((b) => b.status === 'draft')
        break
      case 'quotation':
        list = list.filter((b) => b.status === 'quotation')
        break
      case 'confirmed':
        list = list.filter((b) => ['confirmed', 'partially_scheduled', 'fully_scheduled'].includes(b.status))
        break
      case 'unscheduled':
        list = list.filter((b) => b.schedulingStatus === 'unscheduled')
        break
      case 'recurring':
        list = list.filter((b) => ['recurring', 'school'].includes(b.bookingType))
        break
      case 'today':
        list = list.filter((b) => b.firstJourneyDate === today)
        break
      case 'upcoming':
        list = list.filter((b) => b.firstJourneyDate >= today)
        break
    }
    return list
  },

  get(id: string): BookingRecord {
    const b = mockBookings.find((x) => x.id === id)
    if (!b) {
      const d = drafts.get(id)
      if (d?.id) throw new Error('Booking is still a draft — use getDraft')
      throw new Error('Booking not found')
    }
    return b
  },

  getDraft(id: string): BookingDraft {
    const d = drafts.get(id)
    if (!d) throw new Error('Draft not found')
    return d
  },

  createDraft(
    bookingType?: BookingDraft['bookingType'],
    options?: CreateDraftOptions & { passengers?: PassengerRecord[] },
  ): BookingDraft {
    let draft: BookingDraft

    if (options?.duplicateFromId) {
      const source =
        mockBookings.find((b) => b.id === options.duplicateFromId) ??
        (drafts.get(options.duplicateFromId) as BookingRecord | undefined)
      if (!source) throw new Error('Source booking not found')
      draft = structuredClone(source) as BookingDraft
      draft.status = 'draft'
      delete (draft as { schedulingStatus?: string }).schedulingStatus
      delete (draft as { billingStatus?: string }).billingStatus
    } else if (options?.returnFromBookingId) {
      const source = mockBookings.find((b) => b.id === options.returnFromBookingId)
      if (!source) throw new Error('Source booking not found')
      const outbound = source.trips.find((t) => t.id === options.returnFromTripId) ?? source.trips[0]
      draft = createDefaultDraft('return')
      draft.customerId = source.customerId
      draft.customerName = source.customerName
      draft.passengers = [...source.passengers]
      draft.requirements = { ...source.requirements }
      if (outbound) {
        const returnTrip = createEmptyTrip(outbound.pickupDate, 'Return')
        returnTrip.direction = 'return'
        const pickup = outbound.stops.find((s) => s.type === 'dropoff')
        const dropoff = outbound.stops.find((s) => s.type === 'pickup')
        if (pickup && dropoff) {
          returnTrip.stops[0] = { ...returnTrip.stops[0]!, name: pickup.name, address: pickup.address, type: 'pickup' }
          returnTrip.stops[1] = { ...returnTrip.stops[1]!, name: dropoff.name, address: dropoff.address, type: 'dropoff' }
        }
        draft.trips = [returnTrip]
      }
    } else {
      draft = createDefaultDraft(
        bookingType ?? (options?.urgent ? 'replacement' : 'one_way'),
      )
    }

    if (options?.urgent) {
      draft.priority = 'urgent'
      draft.bookingType = 'replacement'
      draft.dispatch = { ...draft.dispatch, mode: 'send_to_dispatch' }
    }

    if (options?.customerId) {
      draft.customerId = options.customerId
      draft.customerName =
        options.customerName ?? CUSTOMER_CONTEXT[options.customerId]?.name ?? null
      const ctx = CUSTOMER_CONTEXT[options.customerId]
      if (ctx?.poRequired) draft.pricing = { ...draft.pricing, poRequired: true }
    }

    if (options?.passengerId && options.passengers) {
      const p = options.passengers.find((x) => x.id === options.passengerId)
      if (p) draft.passengers = [enrichPassenger(p)]
    }

    const id = `draft-${Date.now()}`
    draft.id = id
    draft.reference = bookingReference(++bookingSeq)
    draft.status = 'draft'
    draft.createdAt = new Date().toISOString()
    draft.updatedAt = draft.createdAt
    draft.currentStep = options?.urgent ? 1 : 1
    drafts.set(id, draft)
    return draft
  },

  saveDraft(draft: BookingDraft): BookingDraft {
    if (!draft.id) throw new Error('Draft id required')
    draft.updatedAt = new Date().toISOString()
    drafts.set(draft.id, { ...draft })
    return draft
  },

  getCustomerContext(customerId: string): CustomerBookingContext | null {
    return CUSTOMER_CONTEXT[customerId] ?? null
  },

  validateDraft(
    draft: BookingDraft,
    opts: { wheelchairVehicleCount?: number; suitableStaffCount?: number },
  ) {
    const customer = draft.customerId ? CUSTOMER_CONTEXT[draft.customerId] : null
    return validateBooking(draft, { customer, ...opts })
  },

  confirmDraft(
    draft: BookingDraft,
    opts: {
      asQuotation?: boolean
      wheelchairVehicleCount?: number
      suitableStaffCount?: number
      mockDuties: DutyDetailRecord[]
      depots: { id: string; name: string }[]
      drivers: { id: string; firstName: string; lastName: string }[]
      vehicles: { id: string; registrationNumber: string }[]
      passengers: PassengerRecord[]
    },
  ): BookingRecord {
    const customer = draft.customerId ? CUSTOMER_CONTEXT[draft.customerId] : null
    const contractRef = customer?.activeContracts[0]?.ref ?? null
    const pricing = estimatePricing(
      { ...draft, pricing: { ...draft.pricing, poRequired: customer?.poRequired ?? false } },
      contractRef,
    )

    const validation = validateBooking(draft, {
      customer,
      wheelchairVehicleCount: opts.wheelchairVehicleCount,
      suitableStaffCount: opts.suitableStaffCount,
    })
    if (!opts.asQuotation && hasBlockingErrors(validation)) {
      throw new Error(validation.find((v) => v.level === 'error')!.message)
    }

    const id = `bkg-${++bookingSeq}`
    const reference = bookingReference(bookingSeq)
    const depot = opts.depots.find((d) => d.id === draft.dispatch.depotId)

    const record: BookingRecord = {
      ...draft,
      id,
      reference,
      status: opts.asQuotation ? 'quotation' : 'confirmed',
      pricing: { ...draft.pricing, ...pricing, contractRef, poRequired: customer?.poRequired ?? false },
      schedulingStatus:
        draft.dispatch.mode === 'assign_now' ? 'fully_scheduled' : 'unscheduled',
      billingStatus: contractRef ? 'contract' : 'pending',
      depotName: depot?.name ?? null,
      warningCount: validation.filter((v) => v.level === 'warning').length,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      trips: draft.trips.map((t) => ({
        ...t,
        status: draft.dispatch.mode === 'assign_now' ? 'assigned' : 'unassigned',
      })),
    }

    mockBookings = [record, ...mockBookings]
    if (draft.id) drafts.delete(draft.id)

    if (!opts.asQuotation && draft.dispatch.mode !== 'assign_now') {
      for (const trip of record.trips) {
        const dutyId = `duty-bkg-${id}-${trip.id}`
        opts.mockDuties.push({
          id: dutyId,
          reference: `${reference}-${trip.label.slice(0, 3).toUpperCase()}`,
          dutyDate: trip.pickupDate,
          startTime: trip.calculatedPickupTime ?? trip.requestedPickupTime ?? null,
          endTime: null,
          status: 'unassigned',
          route: { id: `route-bkg-${trip.id}`, name: `${record.customerName} — ${trip.label}` },
          driver: null,
          vehicle: null,
          notes: `From booking ${reference}`,
        })
        mockTransfersApi.createFromBooking(record, dutyId, trip.id, {
          runReference: `${reference}-${trip.label.slice(0, 3).toUpperCase()}`,
          depotId: draft.dispatch.depotId,
          depotName: depot?.name ?? null,
        })
      }
    }

    if (!opts.asQuotation && draft.dispatch.mode === 'assign_now' && draft.dispatch.driverId && draft.dispatch.vehicleId) {
      const trip = record.trips[0]
      const driver = opts.drivers.find((d) => d.id === draft.dispatch.driverId)
      const vehicle = opts.vehicles.find((v) => v.id === draft.dispatch.vehicleId)
      if (trip && driver && vehicle) {
        const dutyId = `duty-bkg-${id}`
        opts.mockDuties.push({
          id: dutyId,
          reference: reference,
          dutyDate: trip.pickupDate,
          startTime: trip.calculatedPickupTime ?? trip.requestedPickupTime ?? null,
          endTime: null,
          status: 'assigned',
          route: { id: `route-bkg-${trip.id}`, name: `${record.customerName} — ${trip.label}` },
          driver: { id: driver.id, firstName: driver.firstName, lastName: driver.lastName },
          vehicle: { id: vehicle.id, registrationNumber: vehicle.registrationNumber },
          notes: `From booking ${reference}`,
        })
        mockTransfersApi.createFromBooking(record, dutyId, trip.id, {
          driverId: driver.id,
          driverName: `${driver.firstName} ${driver.lastName}`,
          vehicleId: vehicle.id,
          vehicleRegistration: vehicle.registrationNumber,
          runReference: reference,
          depotId: draft.dispatch.depotId,
          depotName: depot?.name ?? null,
        })
      }
    }

    return record
  },

  getAutoPlanProposal(
    draft: BookingDraft,
    drivers: DriverProfile[],
    vehicles: import('@/lib/vehicles/types').VehicleProfile[],
  ): AutoPlanProposal | null {
    return generateAutoPlanProposal(draft, drivers, vehicles)
  },

  calculateEditImpact(
    bookingId: string,
    updated: BookingDraft,
    assignments?: { driverName?: string; vehicleReg?: string; runRef?: string },
  ): EditImpact {
    const original = mockBookings.find((b) => b.id === bookingId)
    if (!original) throw new Error('Booking not found')
    return calculateEditImpact(original, updated, assignments)
  },

  updateBooking(
    bookingId: string,
    updated: BookingDraft,
    _opts: { applyScope: 'trip_only' | 'all_future' | 'recurring_pattern' | 'exception' },
  ): BookingRecord {
    const idx = mockBookings.findIndex((b) => b.id === bookingId)
    if (idx < 0) throw new Error('Booking not found')
    const existing = mockBookings[idx]!
    const record: BookingRecord = {
      ...existing,
      ...updated,
      id: existing.id,
      reference: existing.reference,
      updatedAt: new Date().toISOString(),
      schedulingStatus: existing.schedulingStatus,
      billingStatus: existing.billingStatus,
      depotName: existing.depotName,
    }
    mockBookings[idx] = record
    return record
  },

  cancelBooking(bookingId: string, input: CancelBookingInput): BookingRecord {
    const idx = mockBookings.findIndex((b) => b.id === bookingId)
    if (idx < 0) throw new Error('Booking not found')
    const booking = { ...mockBookings[idx]! }

    if (input.scope === 'entire_booking' || input.scope === 'all_future') {
      booking.status = 'cancelled'
      booking.trips = booking.trips.map((t) => ({ ...t, status: 'cancelled' as const }))
    } else if (input.scope === 'single_trip' && input.tripId) {
      booking.trips = booking.trips.map((t) =>
        t.id === input.tripId ? { ...t, status: 'cancelled' as const } : t,
      )
      if (booking.trips.every((t) => t.status === 'cancelled')) booking.status = 'cancelled'
    } else if (input.scope === 'single_passenger' && input.passengerId) {
      booking.passengers = booking.passengers.filter((p) => p.passengerId !== input.passengerId)
    }

    booking.updatedAt = new Date().toISOString()
    mockBookings[idx] = booking
    return booking
  },

  enrichPassenger(p: PassengerRecord) {
    return enrichPassenger(p)
  },
}
