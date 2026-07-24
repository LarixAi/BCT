import type { DialARideRequestDraft } from './types'
import { DEFAULT_SERVICE_RULES } from './eligibility'

const uid = () => `tmp-${Math.random().toString(36).slice(2, 9)}`

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function formatLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${dayOfMonth}`
}

/** Next operating travel date at least `minDaysAhead` calendar days from today. */
export function nextDialARideTravelDate(minDaysAhead = 2): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + minDaysAhead)
  for (let i = 0; i < 14; i++) {
    const day = DAY_IDS[date.getDay()]!
    if (DEFAULT_SERVICE_RULES.operatingDays.includes(day)) {
      return formatLocalISODate(date)
    }
    date.setDate(date.getDate() + 1)
  }
  return formatLocalISODate(date)
}

export function defaultRequirements(): DialARideRequestDraft['requirements'] {
  return {
    companion: false,
    carer: false,
    wheelchair: false,
    mobilityAid: false,
    passengerLift: false,
    assistance: false,
    bags: false,
    serviceAnimal: false,
    communicationNeeds: '',
  }
}

export function createDefaultDialARideRequest(memberId?: string, memberName?: string, memberNumber?: string): DialARideRequestDraft {
  const travel = new Date()
  while (travel.getDay() === 0) {
    travel.setDate(travel.getDate() + 1)
  }
  const date = travel.toISOString().slice(0, 10)
  return {
    memberId: memberId ?? null,
    memberName: memberName ?? '',
    memberNumber: memberNumber ?? '',
    status: 'draft',
    pickupAddress: '',
    destinationAddress: '',
    journeyPurpose: '',
    returnRequired: false,
    travelDate: date,
    preferredPickupTime: '09:00',
    pickupWindowStart: '08:45',
    pickupWindowEnd: '09:15',
    requiredArrivalTime: '',
    returnTime: '15:00',
    callWhenReady: false,
    flexibleShared: true,
    pickupInstructions: '',
    destinationInstructions: '',
    requirements: defaultRequirements(),
    serviceCheckResult: null,
    serviceCheckMessages: [],
    overrideReason: null,
    declineReason: null,
    currentStep: 1,
  }
}

export function dialARideReference(seq: number) {
  return `DAR-${String(seq).padStart(5, '0')}`
}

export function applyMemberDefaultsToRequest(
  draft: DialARideRequestDraft,
  member: {
    id: string
    firstName: string
    lastName: string
    memberNumber: string
    homeAddress: string
    wheelchairRequired: boolean
    companionEntitlement: boolean
    communicationNeeds: string
  },
): Partial<DialARideRequestDraft> {
  return {
    memberId: member.id,
    memberName: `${member.firstName} ${member.lastName}`,
    memberNumber: member.memberNumber,
    pickupAddress: draft.pickupAddress || member.homeAddress,
    requirements: {
      ...draft.requirements,
      wheelchair: member.wheelchairRequired,
      companion: member.companionEntitlement,
      communicationNeeds: member.communicationNeeds,
    },
  }
}
