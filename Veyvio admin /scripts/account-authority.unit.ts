import assert from 'node:assert/strict'
import {
  decideInvitationAuthority,
  isExecutiveDepartmentInviteApp,
  legacyApplicationsForRoles,
  normalizeAppType,
  roleBelongsToApp,
  rolesAllowedForApp,
} from '../supabase/functions/_shared/account-authority.ts'

function allowed(
  actorRoleKeys: string[],
  targetAppType: string,
  targetRoleKeys: string[],
  sourceApp?: string,
) {
  return decideInvitationAuthority({
    actorRoleKeys,
    targetAppType,
    targetRoleKeys,
    sourceApp,
  })
}

// Executive creates every department-level account.
assert.equal(allowed(['company_owner'], 'EXECUTIVE', ['director']).allowed, true)
assert.equal(allowed(['company_owner'], 'COMMAND', ['transport_manager']).allowed, true)
assert.equal(allowed(['company_owner'], 'FINANCE', ['finance_manager']).allowed, true)
assert.equal(allowed(['company_administrator'], 'HR', ['hr_manager']).allowed, true)

// From the Executive app UI, only Command / Finance / HR department invites.
assert.equal(
  allowed(['company_owner'], 'COMMAND', ['transport_manager'], 'EXECUTIVE').allowed,
  true,
)
assert.equal(
  allowed(['company_owner'], 'FINANCE', ['finance_manager'], 'EXECUTIVE').allowed,
  true,
)
assert.equal(allowed(['company_owner'], 'HR', ['hr_manager'], 'EXECUTIVE').allowed, true)
assert.equal(
  allowed(['company_owner'], 'EXECUTIVE', ['company_administrator'], 'EXECUTIVE').allowed,
  true,
)
assert.equal(
  allowed(['company_owner'], 'DRIVER', ['driver'], 'EXECUTIVE').code,
  'executive_invite_app_forbidden',
)
assert.equal(
  allowed(['company_owner'], 'YARD', ['yard_manager'], 'EXECUTIVE').code,
  'executive_invite_app_forbidden',
)
assert.equal(isExecutiveDepartmentInviteApp('finance'), true)
assert.equal(isExecutiveDepartmentInviteApp('DRIVER'), false)

// Command management creates operational Driver and Yard accounts.
assert.equal(allowed(['transport_manager'], 'DRIVER', ['driver']).allowed, true)
assert.equal(allowed(['operations_manager'], 'DRIVER', ['escort']).allowed, true)
assert.equal(allowed(['transport_manager'], 'YARD', ['yard_manager']).allowed, true)
assert.equal(allowed(['operations_manager'], 'YARD', ['yard_operative']).allowed, true)

// Lateral privilege escalation is denied.
assert.equal(allowed(['transport_manager'], 'FINANCE', ['finance_manager']).code, 'executive_authority_required')
assert.equal(allowed(['finance_manager'], 'DRIVER', ['driver']).code, 'command_authority_required')
assert.equal(allowed(['yard_manager'], 'YARD', ['yard_operative']).code, 'command_authority_required')
assert.equal(allowed(['dispatcher'], 'DRIVER', ['driver']).code, 'command_authority_required')

// A role cannot be smuggled into the wrong application.
assert.equal(allowed(['company_owner'], 'FINANCE', ['transport_manager']).code, 'role_not_valid_for_application')
assert.equal(allowed(['company_owner'], 'NOT_REAL', ['director']).code, 'unknown_application')
assert.equal(roleBelongsToApp('finance_admin', 'FINANCE'), true)
assert.equal(rolesAllowedForApp('HR').includes('hr_officer'), true)
assert.equal(normalizeAppType(' finance '), 'FINANCE')

// Existing memberships receive the correct compatibility scopes until explicit
// application grants have been backfilled.
assert.deepEqual(
  [...legacyApplicationsForRoles(['company_owner'])].sort(),
  ['COMMAND', 'EXECUTIVE'],
)
assert.deepEqual([...legacyApplicationsForRoles(['transport_manager'])], ['COMMAND'])
assert.deepEqual([...legacyApplicationsForRoles(['finance_manager'])], ['FINANCE'])
assert.deepEqual([...legacyApplicationsForRoles(['hr_manager'])], ['HR'])
assert.deepEqual([...legacyApplicationsForRoles(['driver'])], ['DRIVER'])
assert.deepEqual([...legacyApplicationsForRoles(['yard_manager'])], ['YARD'])

console.log('account-authority.unit: ok')
