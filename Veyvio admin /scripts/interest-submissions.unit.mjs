/**
 * Register Interest validation / summary (pure mapping module).
 * Run: npx tsx scripts/interest-submissions.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  INTEREST_CREATE_SCOPE,
  ALLOWED_INTEGRATION_SCOPES,
  isInterestIntakePath,
  makeRequestId,
  planInterestJourney,
  plannedPickupIso,
  summariseInterestStatuses,
  validateInterestSubmission,
} from '../supabase/functions/_shared/interest-submissions.mapping.ts'

assert.equal(ALLOWED_INTEGRATION_SCOPES.has(INTEREST_CREATE_SCOPE), true)
assert.equal(ALLOWED_INTEGRATION_SCOPES.has('interests:read'), false)
assert.equal(ALLOWED_INTEGRATION_SCOPES.has('command:access'), false)

assert.equal(isInterestIntakePath('interests', 'POST'), true)
assert.equal(isInterestIntakePath('v1/interests', 'POST'), true)
assert.equal(isInterestIntakePath('interests', 'GET'), false)
assert.equal(isInterestIntakePath('interests/abc', 'POST'), false)

const valid = validateInterestSubmission({
  source: 'coloop-website',
  externalSubmissionId: 'coloop-form-18425',
  contact: {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+447700900000',
    preferredContactMethod: 'email',
  },
  location: { postcode: 'SW16 2AB', borough: 'Lambeth' },
  interest: {
    service: 'community-transport',
    journeyTypes: ['shopping', 'medical-appointments'],
    wheelchairAccessibleVehicleRequired: true,
    passengerCount: 1,
    message: 'I would like to know when the service launches.',
  },
  consent: {
    privacyAccepted: true,
    marketingAccepted: false,
    privacyNoticeVersion: '2026-08',
    acceptedAt: '2026-08-03T09:30:00Z',
  },
})
assert.equal(valid.ok, true)
if (valid.ok) {
  assert.equal(valid.value.source, 'coloop-website')
  assert.equal(valid.value.sourceLabel, 'Coloop Website')
  assert.equal(valid.value.contactEmail, 'jane@example.com')
  assert.equal(valid.value.wheelchairAccessibleVehicleRequired, true)
  assert.deepEqual(valid.value.journeyTypes, ['shopping', 'medical-appointments'])
}

const missingPrivacy = validateInterestSubmission({
  source: 'coloop-website',
  contact: { name: 'Jane', email: 'jane@example.com' },
  consent: { privacyAccepted: false },
})
assert.equal(missingPrivacy.ok, false)
if (!missingPrivacy.ok) assert.equal(missingPrivacy.code, 'privacy_required')

const noContact = validateInterestSubmission({
  source: 'coloop-website',
  contact: { name: 'Jane' },
  consent: { privacyAccepted: true },
})
assert.equal(noContact.ok, false)

const badEmail = validateInterestSubmission({
  source: 'coloop-website',
  contact: { name: 'Jane', email: 'not-an-email' },
  consent: { privacyAccepted: true },
})
assert.equal(badEmail.ok, false)
if (!badEmail.ok) assert.equal(badEmail.code, 'invalid_email')

const requestId = makeRequestId()
assert.match(requestId, /^REQ-[0-9A-F]{6}$/)

const summary = summariseInterestStatuses(
  [
    { status: 'new', createdAt: new Date().toISOString() },
    { status: 'under_review', createdAt: '2026-01-01T00:00:00Z' },
    { status: 'assigned', createdAt: '2026-01-01T00:00:00Z' },
    { status: 'contacted', createdAt: '2026-01-01T00:00:00Z' },
    { status: 'qualified', createdAt: '2026-01-01T00:00:00Z' },
    { status: 'converted', createdAt: '2026-01-01T00:00:00Z' },
    { status: 'closed', createdAt: '2026-01-01T00:00:00Z' },
    { status: 'spam', createdAt: '2026-01-01T00:00:00Z' },
  ],
  new Date(),
)
assert.equal(summary.newToday, 1)
assert.equal(summary.awaitingReview, 2)
assert.equal(summary.assigned, 1)
assert.equal(summary.contacted, 1)
assert.equal(summary.qualified, 1)
assert.equal(summary.converted, 1)
assert.equal(summary.closed, 1)
assert.equal(summary.spam, 1)

const plan = planInterestJourney({
  source: 'coloop-website-journey',
  source_label: 'CoLoop Website — Journey request',
  wheelchair_accessible_vehicle_required: true,
  passenger_count: 2,
  postcode: 'NW10 4AB',
  message:
    'Type: journey request (not a confirmed booking).\nPickup: 37A Craven Park.\nDestination: Central Middlesex Hospital.\nTravel date: 2026-08-12.\nPreferred pickup time: 09:30.',
  raw_payload: {
    journey: {
      pickup: '37A Craven Park, London NW10 4AB',
      destination: 'Central Middlesex Hospital, Acton Lane, London NW10 7NS',
      travelDate: '2026-08-12',
      preferredPickupTime: '09:30',
    },
  },
})
assert.ok(plan)
assert.equal(plan.travelDate, '2026-08-12')
assert.equal(plan.preferredPickupTime, '09:30')
assert.match(plan.pickup, /Craven Park/)
assert.match(plan.destination, /Central Middlesex/)
assert.equal(plannedPickupIso('2026-08-12', '09:30'), '2026-08-12T09:30:00.000Z')
assert.equal(planInterestJourney({ source: 'coloop-website', message: 'hello' }), null)

console.log('interest-submissions.unit.mjs: all checks passed')
