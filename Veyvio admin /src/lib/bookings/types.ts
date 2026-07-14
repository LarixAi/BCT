export type BookingType =
  | 'one_way'
  | 'return'
  | 'multi_stop'
  | 'recurring'
  | 'school'
  | 'contract'
  | 'group'
  | 'accessible'
  | 'staff'
  | 'replacement'

export type BookingStatus =
  | 'draft'
  | 'quotation'
  | 'awaiting_approval'
  | 'awaiting_payment'
  | 'confirmed'
  | 'partially_scheduled'
  | 'fully_scheduled'
  | 'in_operation'
  | 'completed'
  | 'cancelled'
  | 'closed'

export type TripStatus =
  | 'planned'
  | 'unassigned'
  | 'assigned'
  | 'released'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type StopType = 'pickup' | 'dropoff' | 'depot' | 'waypoint'

export type SchedulingMode = 'pickup_led' | 'arrival_led'

export type DispatchMode = 'assign_now' | 'send_to_dispatch' | 'auto_plan'

export type ValidationLevel = 'error' | 'warning' | 'info'

export interface BookingStop {
  id: string
  sequence: number
  type: StopType
  name: string
  address: string
  passengerId?: string | null
  scheduledTime?: string | null
}

export interface BookingTrip {
  id: string
  label: string
  direction?: 'outbound' | 'return'
  pickupDate: string
  schedulingMode: SchedulingMode
  requestedPickupTime?: string | null
  requiredArrivalTime?: string | null
  calculatedPickupTime?: string | null
  calculatedArrivalTime?: string | null
  stops: BookingStop[]
  status: TripStatus
}

export interface BookingPassengerRef {
  passengerId: string
  firstName: string
  lastName: string
  requirements: string[]
  safeguardingFlag?: boolean
}

export interface BookingServiceRequirements {
  vehicleType: string
  wheelchairAccessible: boolean
  wheelchairPositions: number
  passengerAssistant: boolean
  childSeat: boolean
  boosterSeat: boolean
  lowFloor: boolean
  luggageCapacity: string
  staffingNotes: string
}

export interface BookingRecurrence {
  enabled: boolean
  startDate: string
  endDate: string
  daysOfWeek: string[]
  termTimeOnly: boolean
  morningPickupTime: string
  morningArrivalTime: string
  afternoonPickupTime: string
  afternoonDropoffTime: string
}

export interface BookingPricing {
  baseFare: number
  distanceCharge: number
  supplements: number
  totalPrice: number
  estimatedCost: number
  margin: number
  marginPct: number
  contractRef: string | null
  billingNote: string | null
  poRequired: boolean
  poNumber: string | null
  priceOverride: number | null
  overrideReason: string | null
}

export interface BookingDispatch {
  mode: DispatchMode
  depotId: string | null
  driverId: string | null
  vehicleId: string | null
  assistantId: string | null
}

export interface BookingValidationItem {
  level: ValidationLevel
  code: string
  message: string
}

export interface BookingDraft {
  id?: string
  reference?: string
  bookingType: BookingType
  status: BookingStatus
  customerId: string | null
  customerName: string | null
  passengers: BookingPassengerRef[]
  trips: BookingTrip[]
  requirements: BookingServiceRequirements
  recurrence: BookingRecurrence
  pricing: BookingPricing
  dispatch: BookingDispatch
  journeyPurpose: string
  pickupInstructions: string
  dropoffInstructions: string
  pickupContact: string
  dropoffContact: string
  currentStep: number
  ownerName?: string | null
  priority?: 'normal' | 'urgent'
  urgencyReason?: string | null
  authorisedBy?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface BookingRecord extends BookingDraft {
  id: string
  reference: string
  schedulingStatus: string
  billingStatus: string
  depotName: string | null
  warningCount: number
  createdAt: string
  updatedAt: string
}

export interface BookingListItem {
  id: string
  reference: string
  customerName: string
  passengerSummary: string
  bookingType: BookingType
  firstJourneyDate: string
  tripCount: number
  serviceRequirement: string
  status: BookingStatus
  schedulingStatus: string
  billingStatus: string
  depotName: string | null
  warningCount: number
  owner: string | null
}

export interface CustomerBookingContext {
  id: string
  name: string
  customerType: string
  accountStatus: string
  billingArrangement: string
  creditStatus: string
  activeContracts: Array<{ id: string; name: string; ref: string }>
  pricingRules: string[]
  poRequired: boolean
  contacts: Array<{ name: string; role: string; email: string }>
  previousBookingCount: number
  outstandingIssues: string[]
  contractRules?: {
    wheelchairAllowed: boolean
    invoiceTerms: string
    passengerAssistantIncluded: boolean
    cancellationRules: string
  }
}

export interface CreateDraftOptions {
  customerId?: string
  customerName?: string
  passengerId?: string
  urgent?: boolean
  duplicateFromId?: string
  returnFromTripId?: string
  returnFromBookingId?: string
}

export interface AutoPlanProposal {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleRegistration: string
  runReference: string
  punctualityScore: number
  deadMileageKm: number
  estimatedCost: number
  pickupSequence: string[]
  notes: string
}

export interface EditImpact {
  affectedPassengers: number
  affectedDrivers: string[]
  affectedVehicles: string[]
  affectedRuns: string[]
  timeShiftMinutes: number
  items: string[]
}

export type CancelScope =
  | 'entire_booking'
  | 'single_trip'
  | 'single_passenger'
  | 'single_occurrence'
  | 'all_future'

export interface CancelBookingInput {
  scope: CancelScope
  tripId?: string
  passengerId?: string
  reason: string
  requestedBy: string
  receivedAt: string
  chargeable: boolean
  notifyCustomer: boolean
  notifyDriver: boolean
  replacementNeeded: boolean
}
