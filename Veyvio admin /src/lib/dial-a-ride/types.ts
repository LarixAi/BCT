export type DialARideMemberStatus = 'active' | 'suspended' | 'inactive'

export type DialARideEligibilityStatus = 'eligible' | 'expires_soon' | 'expired' | 'suspended'

export type DialARideRequestStatus =
  | 'draft'
  | 'submitted'
  | 'awaiting_approval'
  | 'accepted'
  | 'declined'
  | 'waiting_list'
  | 'cancelled'

export type DialARideServiceCheckResult =
  | 'eligible'
  | 'eligible_with_warning'
  | 'requires_approval'
  | 'cannot_accept'

export interface DialARideMember {
  id: string
  memberNumber: string
  firstName: string
  lastName: string
  status: DialARideMemberStatus
  eligibilityStatus: DialARideEligibilityStatus
  eligibilityExpiry: string
  serviceZone: string
  homeAddress: string
  mobilityProfile: string
  companionEntitlement: boolean
  wheelchairRequired: boolean
  communicationNeeds: string
  suspensionReason: string | null
  noShowCount: number
  reviewOverdue: boolean
  phone: string
}

export interface DialARideRequirements {
  companion: boolean
  carer: boolean
  wheelchair: boolean
  mobilityAid: boolean
  passengerLift: boolean
  assistance: boolean
  bags: boolean
  serviceAnimal: boolean
  communicationNeeds: string
}

export interface DialARideRequest {
  id: string
  reference: string
  memberId: string
  memberName: string
  memberNumber: string
  status: DialARideRequestStatus
  pickupAddress: string
  destinationAddress: string
  journeyPurpose: string
  returnRequired: boolean
  travelDate: string
  preferredPickupTime: string
  pickupWindowStart: string
  pickupWindowEnd: string
  requiredArrivalTime: string
  returnTime: string
  callWhenReady: boolean
  flexibleShared: boolean
  pickupInstructions: string
  destinationInstructions: string
  requirements: DialARideRequirements
  serviceCheckResult: DialARideServiceCheckResult | null
  serviceCheckMessages: string[]
  overrideReason: string | null
  declineReason: string | null
  jobIds: string[]
  currentStep: number
  createdAt: string
  updatedAt: string
}

export type DialARideRequestDraft = Omit<DialARideRequest, 'id' | 'reference' | 'createdAt' | 'updatedAt' | 'jobIds' | 'memberId'> & {
  id?: string
  reference?: string
  memberId: string | null
  jobIds?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface DialARideRequestListItem {
  id: string
  reference: string
  memberName: string
  memberNumber: string
  status: DialARideRequestStatus
  travelDate: string
  pickupWindow: string
  journey: string
  serviceCheckResult: DialARideServiceCheckResult | null
  warningCount: number
}

export interface DialARideServiceRules {
  bookingWindowDays: number
  maxActiveBookings: number
  operatingDays: string[]
  holidayClosures: string[]
  allowedDestinations: string[]
  maxTripMiles: number
}
