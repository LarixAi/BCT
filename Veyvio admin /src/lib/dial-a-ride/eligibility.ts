import type {
  DialARideMember,
  DialARideRequestDraft,
  DialARideServiceCheckResult,
  DialARideServiceRules,
} from './types'

export type ServiceCheckOutcome = {
  result: DialARideServiceCheckResult
  messages: string[]
  blocking: boolean
}

export const DEFAULT_SERVICE_RULES: DialARideServiceRules = {
  bookingWindowDays: 14,
  maxActiveBookings: 3,
  operatingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  holidayClosures: [],
  allowedDestinations: ['hospital', 'clinic', 'shopping', 'leisure', 'day centre', 'community'],
  maxTripMiles: 15,
}

function dayId(date: string): string {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(date).getDay()] ?? 'mon'
}

export function evaluateMemberEligibility(member: DialARideMember): ServiceCheckOutcome {
  const messages: string[] = []

  if (member.status === 'suspended') {
    return {
      result: 'cannot_accept',
      messages: [member.suspensionReason ?? 'Member is suspended from Dial-a-Ride.'],
      blocking: true,
    }
  }

  if (member.status === 'inactive') {
    return {
      result: 'cannot_accept',
      messages: ['Membership is inactive.'],
      blocking: true,
    }
  }

  if (member.eligibilityStatus === 'expired') {
    return {
      result: 'cannot_accept',
      messages: ['Eligibility has expired — renewal required before travel.'],
      blocking: true,
    }
  }

  if (member.eligibilityStatus === 'suspended') {
    return {
      result: 'cannot_accept',
      messages: ['Eligibility is suspended.'],
      blocking: true,
    }
  }

  if (member.reviewOverdue) {
    messages.push('Eligibility review is overdue — supervisor approval required.')
  }

  if (member.eligibilityStatus === 'expires_soon') {
    messages.push(`Eligibility expires ${member.eligibilityExpiry}.`)
  }

  if (member.noShowCount >= 2) {
    messages.push(`${member.noShowCount} recent no-shows on record.`)
  }

  if (member.reviewOverdue) {
    return { result: 'requires_approval', messages, blocking: false }
  }

  if (messages.length > 0) {
    return { result: 'eligible_with_warning', messages, blocking: false }
  }

  return { result: 'eligible', messages: ['Member is eligible for Dial-a-Ride.'], blocking: false }
}

export function evaluateDialARideRequest(
  request: DialARideRequestDraft,
  member: DialARideMember,
  rules: DialARideServiceRules = DEFAULT_SERVICE_RULES,
  activeBookingCount = 0,
): ServiceCheckOutcome {
  const memberCheck = evaluateMemberEligibility(member)
  if (memberCheck.blocking) return memberCheck

  const messages = [...memberCheck.messages]

  if (!request.pickupAddress.trim() || !request.destinationAddress.trim()) {
    return {
      result: 'cannot_accept',
      messages: ['Pickup and destination are required.'],
      blocking: true,
    }
  }

  const travelDay = dayId(request.travelDate)
  if (!rules.operatingDays.includes(travelDay)) {
    return {
      result: 'cannot_accept',
      messages: ['Dial-a-Ride does not operate on the selected day.'],
      blocking: true,
    }
  }

  if (rules.holidayClosures.includes(request.travelDate)) {
    return {
      result: 'cannot_accept',
      messages: ['Service is closed on the selected date.'],
      blocking: true,
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const travel = new Date(request.travelDate)
  const diffDays = Math.ceil((travel.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) {
    return {
      result: 'cannot_accept',
      messages: ['Travel date is in the past.'],
      blocking: true,
    }
  }
  if (diffDays > rules.bookingWindowDays) {
    messages.push(`Booking is outside the ${rules.bookingWindowDays}-day advance window.`)
  }

  if (activeBookingCount >= rules.maxActiveBookings) {
    return {
      result: 'requires_approval',
      messages: [...messages, 'Member already has the maximum active bookings.'],
      blocking: false,
    }
  }

  const dest = request.destinationAddress.toLowerCase()
  const allowed = rules.allowedDestinations.some((d) => dest.includes(d))
  if (!allowed) {
    messages.push('Destination may be outside standard service rules — check zone limits.')
  }

  if (!member.serviceZone || !request.pickupAddress.toLowerCase().includes(member.serviceZone.split(' ')[0]!.toLowerCase())) {
    if (!request.pickupAddress.toLowerCase().includes('leeds') && !request.pickupAddress.toLowerCase().includes('wembley')) {
      messages.push('Pickup may be outside the member service zone.')
    }
  }

  if (memberCheck.result === 'requires_approval') {
    return { result: 'requires_approval', messages, blocking: false }
  }

  if (messages.some((m) => m.includes('outside') || m.includes('maximum') || m.includes('advance'))) {
    return { result: 'eligible_with_warning', messages, blocking: false }
  }

  return { result: 'eligible', messages, blocking: false }
}

export function canConfirmWithoutOverride(outcome: ServiceCheckOutcome): boolean {
  return outcome.result === 'eligible' || outcome.result === 'eligible_with_warning'
}
