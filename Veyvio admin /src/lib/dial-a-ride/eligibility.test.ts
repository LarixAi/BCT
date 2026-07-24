import { describe, expect, it } from 'vitest'
import { createDefaultDialARideRequest, nextDialARideTravelDate } from '@/lib/dial-a-ride/defaults'
import { DEFAULT_SERVICE_RULES, evaluateDialARideRequest, evaluateMemberEligibility } from '@/lib/dial-a-ride/eligibility'
import { buildJobsFromDialARideRequest } from '@/lib/dial-a-ride/job-generation'
import type { DialARideMember, DialARideRequest } from '@/lib/dial-a-ride/types'

const member: DialARideMember = {
  id: 'dar-m-1',
  memberNumber: 'DAR-10042',
  firstName: 'Mary',
  lastName: 'Jones',
  status: 'active',
  eligibilityStatus: 'eligible',
  eligibilityExpiry: '2027-03-31',
  serviceZone: 'Wembley Central',
  homeAddress: '14 Maple Close, Wembley',
  mobilityProfile: 'Walking frame',
  companionEntitlement: true,
  wheelchairRequired: false,
  communicationNeeds: '',
  suspensionReason: null,
  noShowCount: 0,
  reviewOverdue: false,
  phone: '07700 900142',
}

describe('dial-a-ride eligibility', () => {
  it('blocks suspended members', () => {
    const outcome = evaluateMemberEligibility({
      ...member,
      status: 'suspended',
      eligibilityStatus: 'suspended',
      suspensionReason: 'No-shows',
    })
    expect(outcome.blocking).toBe(true)
    expect(outcome.result).toBe('cannot_accept')
  })

  it('requires approval when review is overdue', () => {
    const outcome = evaluateMemberEligibility({ ...member, reviewOverdue: true })
    expect(outcome.result).toBe('requires_approval')
  })

  it('picks the next operating travel date', () => {
    const travelDate = nextDialARideTravelDate(2)
    const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(travelDate).getDay()]!
    expect(DEFAULT_SERVICE_RULES.operatingDays).toContain(day)
  })
})

describe('dial-a-ride job generation', () => {
  it('creates return leg when required', () => {
    const request: DialARideRequest = {
      ...createDefaultDialARideRequest(member.id, 'Mary Jones', member.memberNumber),
      id: 'dar-req-test',
      reference: 'DAR-TEST',
      memberId: member.id,
      pickupAddress: 'Home',
      destinationAddress: 'Hospital',
      returnRequired: true,
      jobIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const jobs = buildJobsFromDialARideRequest(request, member)
    expect(jobs).toHaveLength(2)
    expect(jobs[1]?.leg).toBe('return')
  })

  it('evaluates a complete request as eligible', () => {
    const travel = new Date()
    do {
      travel.setDate(travel.getDate() + 1)
    } while (travel.getDay() === 0)
    const draft = {
      ...createDefaultDialARideRequest(member.id, 'Mary Jones', member.memberNumber),
      memberId: member.id,
      pickupAddress: '14 Maple Close, Wembley',
      destinationAddress: 'Wembley Hospital clinic',
      travelDate: travel.toISOString().slice(0, 10),
    }
    const outcome = evaluateDialARideRequest(draft, member)
    expect(outcome.blocking).toBe(false)
    expect(['eligible', 'eligible_with_warning']).toContain(outcome.result)
  })
})
