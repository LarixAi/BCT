import type { DutyDetailRecord } from './types'
import type {
  DialARideMember,
  DialARideRequest,
  DialARideRequestDraft,
  DialARideRequestListItem,
} from '@/lib/dial-a-ride/types'
import { createDefaultDialARideRequest, dialARideReference, nextDialARideTravelDate } from '@/lib/dial-a-ride/defaults'
import {
  canConfirmWithoutOverride,
  DEFAULT_SERVICE_RULES,
  evaluateDialARideRequest,
  evaluateMemberEligibility,
} from '@/lib/dial-a-ride/eligibility'
import { buildJobsFromDialARideRequest } from '@/lib/dial-a-ride/job-generation'
import { mockTransfersApi } from './mock-transfers'

let requestSeq = 1002

const members: DialARideMember[] = [
  {
    id: 'dar-m-1',
    memberNumber: 'DAR-10042',
    firstName: 'Mary',
    lastName: 'Jones',
    status: 'active',
    eligibilityStatus: 'eligible',
    eligibilityExpiry: '2027-03-31',
    serviceZone: 'Wembley Central',
    homeAddress: '14 Maple Close, Wembley, HA9 7AB',
    mobilityProfile: 'Walking frame — boarding assistance',
    companionEntitlement: true,
    wheelchairRequired: false,
    communicationNeeds: '',
    suspensionReason: null,
    noShowCount: 0,
    reviewOverdue: false,
    phone: '07700 900142',
  },
  {
    id: 'dar-m-2',
    memberNumber: 'DAR-10018',
    firstName: 'George',
    lastName: 'Parker',
    status: 'suspended',
    eligibilityStatus: 'suspended',
    eligibilityExpiry: '2026-12-01',
    serviceZone: 'North Brent',
    homeAddress: '8 Birch Avenue, Brent, NW10 1AA',
    mobilityProfile: 'Independent',
    companionEntitlement: false,
    wheelchairRequired: false,
    communicationNeeds: '',
    suspensionReason: 'Three no-shows in 30 days',
    noShowCount: 3,
    reviewOverdue: false,
    phone: '07700 900118',
  },
  {
    id: 'dar-m-3',
    memberNumber: 'DAR-10055',
    firstName: 'Elsie',
    lastName: 'Wright',
    status: 'active',
    eligibilityStatus: 'expires_soon',
    eligibilityExpiry: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    serviceZone: 'South Brent',
    homeAddress: '22 Cedar Road, Brent, NW10 3CD',
    mobilityProfile: 'Wheelchair user',
    companionEntitlement: false,
    wheelchairRequired: true,
    communicationNeeds: 'Hearing loop preferred',
    suspensionReason: null,
    noShowCount: 1,
    reviewOverdue: true,
    phone: '07700 900155',
  },
  {
    id: 'dar-m-4',
    memberNumber: 'DAR-10003',
    firstName: 'Robert',
    lastName: 'Davies',
    status: 'active',
    eligibilityStatus: 'expired',
    eligibilityExpiry: '2025-11-30',
    serviceZone: 'Kingsbury',
    homeAddress: '5 Elm Street, Kingsbury, NW9 8EF',
    mobilityProfile: 'Low mobility',
    companionEntitlement: false,
    wheelchairRequired: false,
    communicationNeeds: '',
    suspensionReason: null,
    noShowCount: 0,
    reviewOverdue: false,
    phone: '07700 900003',
  },
]

const requests = new Map<string, DialARideRequest>()

function seedRequests() {
  if (requests.size > 0) return
  const mary = members[0]!
  const awaiting: DialARideRequest = {
    ...createDefaultDialARideRequest(mary.id, `${mary.firstName} ${mary.lastName}`, mary.memberNumber),
    id: 'dar-req-1',
    reference: 'DAR-01001',
    memberId: mary.id,
    status: 'awaiting_approval',
    pickupAddress: mary.homeAddress,
    destinationAddress: 'Wembley Hospital outpatient clinic',
    journeyPurpose: 'medical',
    travelDate: nextDialARideTravelDate(2),
    preferredPickupTime: '10:30',
    pickupWindowStart: '10:15',
    pickupWindowEnd: '10:45',
    requiredArrivalTime: '11:00',
    serviceCheckResult: 'eligible',
    serviceCheckMessages: ['Member is eligible for Dial-a-Ride.'],
    jobIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStep: 6,
  }
  requests.set(awaiting.id, awaiting)
}

seedRequests()

function toListItem(r: DialARideRequest): DialARideRequestListItem {
  return {
    id: r.id,
    reference: r.reference,
    memberName: r.memberName,
    memberNumber: r.memberNumber,
    status: r.status,
    travelDate: r.travelDate,
    pickupWindow: `${r.pickupWindowStart}–${r.pickupWindowEnd}`,
    journey: `${r.pickupAddress} → ${r.destinationAddress}`,
    serviceCheckResult: r.serviceCheckResult,
    warningCount: r.serviceCheckMessages.length,
  }
}

function activeBookingCount(memberId: string): number {
  return [...requests.values()].filter(
    (r) => r.memberId === memberId && ['submitted', 'awaiting_approval', 'accepted', 'waiting_list'].includes(r.status),
  ).length
}

function normalizeDraft(draft: DialARideRequestDraft): DialARideRequest {
  const now = new Date().toISOString()
  const id = draft.id ?? `dar-req-${Date.now()}`
  const reference = draft.reference ?? dialARideReference(++requestSeq)
  return {
    ...createDefaultDialARideRequest(),
    ...draft,
    memberId: draft.memberId ?? '',
    id,
    reference,
    jobIds: draft.jobIds ?? [],
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  }
}

export const mockDialARideApi = {
  listMembers(): DialARideMember[] {
    return members.map((m) => ({ ...m }))
  },

  getMember(id: string): DialARideMember {
    const m = members.find((x) => x.id === id)
    if (!m) throw new Error('Member not found')
    return { ...m }
  },

  listRequests(params?: { view?: string }): DialARideRequestListItem[] {
    seedRequests()
    const today = new Date().toISOString().slice(0, 10)
    let list = [...requests.values()]
    switch (params?.view) {
      case 'today':
        list = list.filter((r) => r.travelDate === today)
        break
      case 'upcoming':
        list = list.filter((r) => r.travelDate >= today)
        break
      case 'cancelled':
        list = list.filter((r) => r.status === 'cancelled' || r.status === 'declined')
        break
      case 'members':
        return []
      default:
        break
    }
    return list.map(toListItem).sort((a, b) => a.travelDate.localeCompare(b.travelDate))
  },

  getRequest(id: string): DialARideRequest {
    seedRequests()
    const r = requests.get(id)
    if (!r) throw new Error('Request not found')
    return { ...r }
  },

  createRequestDraft(memberId?: string): DialARideRequest {
    const member = memberId ? members.find((m) => m.id === memberId) : undefined
    const base = createDefaultDialARideRequest(
      member?.id,
      member ? `${member.firstName} ${member.lastName}` : undefined,
      member?.memberNumber,
    )
    if (member) {
      base.memberId = member.id
      base.pickupAddress = member.homeAddress
      base.requirements.wheelchair = member.wheelchairRequired
      base.requirements.companion = member.companionEntitlement
      base.requirements.communicationNeeds = member.communicationNeeds
    }
    const now = new Date().toISOString()
    const id = `dar-req-${Date.now()}`
    const record: DialARideRequest = {
      ...base,
      memberId: base.memberId ?? '',
      id,
      reference: dialARideReference(++requestSeq),
      jobIds: [],
      createdAt: now,
      updatedAt: now,
    }
    requests.set(record.id, record)
    return { ...record }
  },

  saveRequest(draft: DialARideRequestDraft): DialARideRequest {
    const existing = draft.id ? requests.get(draft.id) : undefined
    const record = normalizeDraft({ ...existing, ...draft, memberId: draft.memberId ?? existing?.memberId ?? '' })
    requests.set(record.id, record)
    return { ...record }
  },

  runServiceChecks(request: DialARideRequestDraft) {
    if (!request.memberId) {
      return {
        result: 'cannot_accept' as const,
        messages: ['Select a member before running service checks.'],
        blocking: true,
      }
    }
    const member = members.find((m) => m.id === request.memberId)
    if (!member) throw new Error('Member not found')
    return evaluateDialARideRequest(request, member, DEFAULT_SERVICE_RULES, activeBookingCount(member.id))
  },

  evaluateMember(memberId: string) {
    const member = members.find((m) => m.id === memberId)
    if (!member) throw new Error('Member not found')
    return evaluateMemberEligibility(member)
  },

  acceptRequest(
    requestId: string,
    opts: { overrideReason?: string; mockDuties: DutyDetailRecord[] },
  ): DialARideRequest {
    seedRequests()
    const request = requests.get(requestId)
    if (!request) throw new Error('Request not found')
    if (!request.memberId) throw new Error('Member is required')
    const member = members.find((m) => m.id === request.memberId)
    if (!member) throw new Error('Member not found')

    const checks = evaluateDialARideRequest(request, member, DEFAULT_SERVICE_RULES, activeBookingCount(member.id))
    if (checks.blocking && !opts.overrideReason?.trim()) {
      throw new Error(checks.messages[0] ?? 'Request cannot be accepted')
    }
    if (!canConfirmWithoutOverride(checks) && !opts.overrideReason?.trim()) {
      throw new Error('Authorised override reason is required')
    }

    const trip = mockTransfersApi.createFromDialARideRequest(request, member, {
      mockDuties: opts.mockDuties,
    })
    const updated: DialARideRequest = {
      ...request,
      status: 'accepted',
      serviceCheckResult: checks.result,
      serviceCheckMessages: checks.messages,
      overrideReason: opts.overrideReason ?? null,
      jobIds: trip.jobs.map((j) => j.id),
      updatedAt: new Date().toISOString(),
    }
    requests.set(requestId, updated)
    return { ...updated }
  },

  declineRequest(requestId: string, reason: string): DialARideRequest {
    const request = requests.get(requestId)
    if (!request) throw new Error('Request not found')
    const updated = {
      ...request,
      status: 'declined' as const,
      declineReason: reason,
      updatedAt: new Date().toISOString(),
    }
    requests.set(requestId, updated)
    return { ...updated }
  },

  waitingListRequest(requestId: string): DialARideRequest {
    const request = requests.get(requestId)
    if (!request) throw new Error('Request not found')
    const updated = {
      ...request,
      status: 'waiting_list' as const,
      updatedAt: new Date().toISOString(),
    }
    requests.set(requestId, updated)
    return { ...updated }
  },

  summary() {
    seedRequests()
    const today = new Date().toISOString().slice(0, 10)
    const all = [...requests.values()]
    return {
      requestsToday: all.filter((r) => r.travelDate === today).length,
      awaitingDecision: all.filter((r) => r.status === 'awaiting_approval' || r.status === 'submitted').length,
      unscheduled: all.filter((r) => r.status === 'accepted').length,
      membersTravelling: all.filter((r) => r.travelDate === today && r.status === 'accepted').length,
    }
  },
}
