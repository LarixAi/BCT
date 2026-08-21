import assert from 'node:assert/strict'
import {
  canonicalExecutiveRoles,
  decideExecutiveAuthorisation,
  executiveCapabilitiesForRoles,
} from '../supabase/functions/_shared/executive-authorisation.ts'

const ACTOR = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const COMPANY_A = '33333333-3333-4333-8333-333333333333'
const COMPANY_B = '44444444-4444-4444-8444-444444444444'

function decide(overrides: Record<string, unknown> = {}) {
  return decideExecutiveAuthorisation({
    actorUserId: ACTOR,
    roleKeys: ['company_owner'],
    action: 'executive.dashboard.read',
    companyId: COMPANY_A,
    resourceCompanyId: COMPANY_A,
    ...overrides,
  } as Parameters<typeof decideExecutiveAuthorisation>[0])
}

assert.deepEqual(canonicalExecutiveRoles(['COMPANY_OWNER', 'executive_reader']), [
  'chief_executive',
  'board_reader',
])
assert.equal(decide().allowed, true)
assert.equal(decide({ action: 'not.registered' }).code, 'unknown_action')
assert.equal(decide({ roleKeys: ['transport_manager'] }).code, 'executive_role_required')
assert.equal(
  decide({ resourceCompanyId: COMPANY_B }).code,
  'resource_scope_forbidden',
)
assert.equal(
  decide({
    action: 'executive.branch.read',
    resourceBranchId: 'branch-b',
    resourceBranchBelongsToCompany: false,
  }).code,
  'resource_scope_forbidden',
)

assert.equal(
  decide({
    action: 'executive.accounts.manage',
    roleKeys: ['company_administrator'],
  }).allowed,
  true,
)
assert.equal(
  decide({
    action: 'executive.accounts.manage',
    roleKeys: ['director'],
  }).code,
  'permission_denied',
)
assert.equal(
  decide({
    action: 'executive.audit.read',
    roleKeys: ['executive_auditor'],
  }).allowed,
  true,
)
assert.equal(
  decide({
    action: 'executive.audit.read',
    roleKeys: ['executive_reader'],
  }).code,
  'permission_denied',
)
assert.equal(
  decide({
    action: 'executive.budget.propose',
    roleKeys: ['company_owner'],
  }).allowed,
  true,
)
assert.equal(
  decide({
    action: 'executive.budget.approve',
    roleKeys: ['company_owner'],
    proposerUserId: OTHER,
  }).code,
  'permission_denied',
)
assert.equal(
  decide({
    action: 'executive.budget.review',
    roleKeys: ['board_member'],
  }).allowed,
  true,
)
assert.equal(
  decide({
    action: 'executive.budget.review',
    roleKeys: ['company_owner'],
  }).code,
  'permission_denied',
)
assert.equal(
  decide({
    action: 'executive.budget.approve',
    roleKeys: ['board_member'],
    proposerUserId: ACTOR,
  }).code,
  'separation_of_duties_required',
)
assert.equal(
  decide({
    action: 'executive.budget.approve',
    roleKeys: ['board_member'],
    proposerUserId: OTHER,
  }).allowed,
  true,
)
assert.equal(
  decide({
    action: 'executive.safety_stop.override',
    roleKeys: ['company_owner', 'director'],
  }).code,
  'independent_safety_authority_required',
)

const ownerCapabilities = executiveCapabilitiesForRoles(['company_owner'])
assert.equal(ownerCapabilities.includes('executive.accounts.manage'), true)
assert.equal(ownerCapabilities.includes('executive.safety_stop.override'), false)
assert.equal(ownerCapabilities.includes('executive.budget.approve'), false)

console.log('executive-authorisation.unit: ok')
