import type { BookingDraft, BookingTrip, BookingType } from './types'

const uid = () => `tmp-${Math.random().toString(36).slice(2, 9)}`

export function defaultPricing() {
  return {
    baseFare: 0,
    distanceCharge: 0,
    supplements: 0,
    totalPrice: 0,
    estimatedCost: 0,
    margin: 0,
    marginPct: 0,
    contractRef: null,
    billingNote: null,
    poRequired: false,
    poNumber: null,
    priceOverride: null,
    overrideReason: null,
  }
}

export function defaultRequirements() {
  return {
    vehicleType: 'minibus',
    wheelchairAccessible: false,
    wheelchairPositions: 0,
    passengerAssistant: false,
    childSeat: false,
    boosterSeat: false,
    lowFloor: false,
    luggageCapacity: 'standard',
    staffingNotes: '',
  }
}

export function defaultRecurrence() {
  return {
    enabled: false,
    startDate: '',
    endDate: '',
    daysOfWeek: [] as string[],
    termTimeOnly: false,
    morningPickupTime: '07:45',
    morningArrivalTime: '08:30',
    afternoonPickupTime: '15:15',
    afternoonDropoffTime: '16:00',
  }
}

export function createEmptyTrip(pickupDate: string, label = 'Outbound'): BookingTrip {
  return {
    id: uid(),
    label,
    direction: 'outbound',
    pickupDate,
    schedulingMode: 'pickup_led',
    requestedPickupTime: '08:00',
    requiredArrivalTime: null,
    calculatedPickupTime: null,
    calculatedArrivalTime: null,
    stops: [
      { id: uid(), sequence: 1, type: 'pickup', name: 'Pickup', address: '', scheduledTime: '08:00' },
      { id: uid(), sequence: 2, type: 'dropoff', name: 'Drop-off', address: '', scheduledTime: null },
    ],
    status: 'planned',
  }
}

export function createDefaultDraft(bookingType: BookingType = 'one_way'): BookingDraft {
  const date = new Date().toISOString().slice(0, 10)
  const trips = [createEmptyTrip(date)]
  if (bookingType === 'return' || bookingType === 'school') {
    trips.push({
      ...createEmptyTrip(date, 'Return'),
      direction: 'return',
      label: 'Return',
    })
  }

  const recurrence = defaultRecurrence()
  if (bookingType === 'recurring' || bookingType === 'school') {
    recurrence.enabled = true
    recurrence.daysOfWeek = ['mon', 'tue', 'wed', 'thu', 'fri']
    recurrence.startDate = date
    const end = new Date()
    end.setMonth(end.getMonth() + 3)
    recurrence.endDate = end.toISOString().slice(0, 10)
  }

  const requirements = defaultRequirements()
  if (bookingType === 'accessible') {
    requirements.wheelchairAccessible = true
    requirements.wheelchairPositions = 1
    requirements.lowFloor = true
  }
  if (bookingType === 'school') {
    requirements.boosterSeat = true
  }

  return {
    bookingType,
    status: 'draft',
    customerId: null,
    customerName: null,
    passengers: [],
    trips,
    requirements,
    recurrence,
    pricing: defaultPricing(),
    dispatch: {
      mode: 'send_to_dispatch',
      depotId: null,
      driverId: null,
      vehicleId: null,
      assistantId: null,
    },
    journeyPurpose: '',
    pickupInstructions: '',
    dropoffInstructions: '',
    pickupContact: '',
    dropoffContact: '',
    currentStep: 1,
    ownerName: 'Larone Laing',
  }
}

export function bookingReference(seq: number) {
  return `BKG-${String(seq).padStart(5, '0')}`
}
