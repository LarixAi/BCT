import type {
  BookingDraft,
  BookingValidationItem,
  CustomerBookingContext,
} from './types'

interface ValidationContext {
  customer?: CustomerBookingContext | null
  wheelchairVehicleCount?: number
  suitableStaffCount?: number
}

export function validateBooking(draft: BookingDraft, ctx: ValidationContext = {}): BookingValidationItem[] {
  const items: BookingValidationItem[] = []

  if (!draft.customerId) {
    items.push({ level: 'error', code: 'customer_required', message: 'A customer must be selected.' })
  } else if (ctx.customer?.accountStatus === 'suspended') {
    items.push({ level: 'error', code: 'account_inactive', message: 'Customer account is suspended.' })
  } else if (ctx.customer?.creditStatus === 'on_hold') {
    items.push({ level: 'warning', code: 'credit_hold', message: 'Customer credit status is on hold — verify before confirming.' })
  }

  if (ctx.customer?.poRequired && !draft.pricing.poNumber?.trim() && draft.priority !== 'urgent') {
    items.push({ level: 'error', code: 'po_required', message: 'Purchase order number is required for this customer.' })
  }

  if (draft.priority === 'urgent' && !draft.authorisedBy?.trim()) {
    items.push({ level: 'warning', code: 'urgent_auth', message: 'Urgent booking — senior authorisation name recommended.' })
  }

  if (draft.passengers.length === 0) {
    items.push({ level: 'error', code: 'passengers_required', message: 'At least one passenger must be added.' })
  }

  for (const trip of draft.trips) {
    const pickup = trip.stops.find((s) => s.type === 'pickup')
    const dropoff = trip.stops.find((s) => s.type === 'dropoff')
    if (!pickup?.address?.trim() || !dropoff?.address?.trim()) {
      items.push({
        level: 'error',
        code: 'addresses_incomplete',
        message: `${trip.label}: pickup and drop-off addresses are required.`,
      })
    }
    if (trip.schedulingMode === 'pickup_led' && !trip.requestedPickupTime) {
      items.push({ level: 'error', code: 'pickup_time', message: `${trip.label}: pickup time is required.` })
    }
    if (trip.schedulingMode === 'arrival_led' && !trip.requiredArrivalTime) {
      items.push({ level: 'error', code: 'arrival_time', message: `${trip.label}: required arrival time is needed.` })
    }
  }

  if (draft.requirements.wheelchairAccessible) {
    const wcVehicles = ctx.wheelchairVehicleCount ?? 0
    const needed = draft.requirements.wheelchairPositions || 1
    if (wcVehicles < needed) {
      items.push({
        level: 'error',
        code: 'no_wc_vehicle',
        message: `No wheelchair-accessible vehicle with ${needed} position(s) is currently available.`,
      })
    }
  }

  if (draft.requirements.passengerAssistant && (ctx.suitableStaffCount ?? 0) === 0) {
    items.push({
      level: 'warning',
      code: 'no_assistant',
      message: 'No passenger assistant is currently marked available.',
    })
  }

  if (draft.dispatch.mode === 'assign_now') {
    if (!draft.dispatch.depotId) {
      items.push({ level: 'error', code: 'depot_required', message: 'Depot is required when assigning now.' })
    }
    if (!draft.dispatch.driverId || !draft.dispatch.vehicleId) {
      items.push({ level: 'error', code: 'assignment_incomplete', message: 'Driver and vehicle are required for assign now.' })
    }
  }

  if (draft.pricing.totalPrice > 0 && draft.pricing.marginPct < 10 && !draft.pricing.overrideReason) {
    items.push({
      level: 'warning',
      code: 'low_margin',
      message: 'Estimated margin is below 10% — override reason required if confirming.',
    })
  }

  if (draft.passengers.some((p) => p.safeguardingFlag)) {
    items.push({
      level: 'info',
      code: 'safeguarding',
      message: 'Safeguarding restrictions apply — only authorised staff will see full details.',
    })
  }

  return items
}

export function hasBlockingErrors(items: BookingValidationItem[]) {
  return items.some((i) => i.level === 'error')
}

export function estimatePricing(draft: BookingDraft, contractRef: string | null) {
  const passengerCount = Math.max(draft.passengers.length, 1)
  const tripCount = draft.trips.length
  const baseFare = contractRef ? 0 : 35 * tripCount
  const distanceCharge = 18.5 * tripCount * passengerCount * 0.4
  let supplements = 0
  if (draft.requirements.wheelchairAccessible) supplements += 22
  if (draft.requirements.passengerAssistant) supplements += 28
  if (draft.requirements.boosterSeat) supplements += 5
  const totalPrice = contractRef ? 0 : baseFare + distanceCharge + supplements
  const estimatedCost = totalPrice * 0.68
  const margin = totalPrice - estimatedCost
  const marginPct = totalPrice > 0 ? (margin / totalPrice) * 100 : 0

  return {
    baseFare,
    distanceCharge,
    supplements,
    totalPrice: draft.pricing.priceOverride ?? totalPrice,
    estimatedCost,
    margin: (draft.pricing.priceOverride ?? totalPrice) - estimatedCost,
    marginPct,
    contractRef,
    billingNote: contractRef ? `Covered by ${contractRef}` : null,
    poRequired: draft.pricing.poRequired,
    poNumber: draft.pricing.poNumber,
    priceOverride: draft.pricing.priceOverride,
    overrideReason: draft.pricing.overrideReason,
  }
}

export function calculateTripTimes(trip: BookingDraft['trips'][0]) {
  const journeyMinutes = 42
  const boardingMinutes = 8
  if (trip.schedulingMode === 'pickup_led' && trip.requestedPickupTime) {
    const [h, m] = trip.requestedPickupTime.split(':').map(Number)
    const arrival = new Date()
    arrival.setHours(h, m + journeyMinutes + boardingMinutes, 0, 0)
    return {
      calculatedPickupTime: trip.requestedPickupTime,
      calculatedArrivalTime: `${String(arrival.getHours()).padStart(2, '0')}:${String(arrival.getMinutes()).padStart(2, '0')}`,
    }
  }
  if (trip.schedulingMode === 'arrival_led' && trip.requiredArrivalTime) {
    const [h, m] = trip.requiredArrivalTime.split(':').map(Number)
    const pickup = new Date()
    pickup.setHours(h, m - journeyMinutes - boardingMinutes, 0, 0)
    return {
      calculatedPickupTime: `${String(pickup.getHours()).padStart(2, '0')}:${String(pickup.getMinutes()).padStart(2, '0')}`,
      calculatedArrivalTime: trip.requiredArrivalTime,
    }
  }
  return { calculatedPickupTime: null, calculatedArrivalTime: null }
}
