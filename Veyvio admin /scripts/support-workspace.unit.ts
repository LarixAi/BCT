/**
 * Wave 3C — support workspace integrity regression matrix.
 */
import assert from 'node:assert/strict'
import {
  decideMembershipWorkspaceIdentity,
  decideSupportWorkspaceIdentity,
  isSupportGrantActive,
} from '../supabase/functions/_shared/support-workspace.ts'

const activeGrant = {
  id: 'grant-1',
  companyId: 'co-target',
  accessLevel: 'read_only',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  revokedAt: null,
  startsAt: new Date(Date.now() - 60_000).toISOString(),
}

// Happy path: active grant → support authority, null membership
{
  const decision = decideSupportWorkspaceIdentity({
    platformRole: 'platform_support',
    jwtCompanyId: 'co-target',
    grant: activeGrant,
  })
  assert.equal(decision.ok, true)
  if (decision.ok) {
    assert.equal(decision.workspaceAuthority, 'support')
    assert.equal(decision.membershipId, null)
    assert.equal(decision.companyId, 'co-target')
    assert.equal(decision.supportGrantId, 'grant-1')
    assert.deepEqual(decision.roleKeys, ['support'])
    assert.deepEqual(decision.permissions, [])
  }
}

// Missing grant
assert.equal(
  decideSupportWorkspaceIdentity({
    platformRole: 'platform_admin',
    jwtCompanyId: 'co-target',
    grant: null,
  }).ok,
  false,
)

// Expired grant
{
  const decision = decideSupportWorkspaceIdentity({
    platformRole: 'platform_admin',
    jwtCompanyId: 'co-target',
    grant: {
      ...activeGrant,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    },
  })
  assert.equal(decision.ok, false)
  if (!decision.ok) assert.equal(decision.code, 'support_grant_inactive')
}

// Revoked grant
{
  const decision = decideSupportWorkspaceIdentity({
    platformRole: 'platform_admin',
    jwtCompanyId: 'co-target',
    grant: {
      ...activeGrant,
      revokedAt: new Date().toISOString(),
    },
  })
  assert.equal(decision.ok, false)
  if (!decision.ok) assert.equal(decision.code, 'support_grant_inactive')
}

// Forged company switch (JWT company ≠ grant company)
{
  const decision = decideSupportWorkspaceIdentity({
    platformRole: 'platform_admin',
    jwtCompanyId: 'co-forged',
    grant: activeGrant,
  })
  assert.equal(decision.ok, false)
  if (!decision.ok) assert.equal(decision.code, 'support_company_mismatch')
}

// Fake membership id rejected
{
  const decision = decideSupportWorkspaceIdentity({
    platformRole: 'platform_admin',
    jwtCompanyId: 'co-target',
    grant: activeGrant,
    clientMembershipId: 'mem-fake',
  })
  assert.equal(decision.ok, false)
  if (!decision.ok) assert.equal(decision.code, 'support_fake_membership')
}

// Platform role required
{
  const decision = decideSupportWorkspaceIdentity({
    platformRole: null,
    jwtCompanyId: 'co-target',
    grant: activeGrant,
  })
  assert.equal(decision.ok, false)
  if (!decision.ok) assert.equal(decision.code, 'support_platform_required')
}

// Stale target company on grant (empty)
{
  const decision = decideSupportWorkspaceIdentity({
    platformRole: 'platform_admin',
    jwtCompanyId: 'co-target',
    grant: { ...activeGrant, companyId: '' },
  })
  assert.equal(decision.ok, false)
}

// Membership identity never looks like support
{
  const membership = decideMembershipWorkspaceIdentity({
    companyId: 'co-a',
    membershipId: 'mem-1',
    roleKeys: ['transport_manager'],
    permissions: ['duties.manage'],
  })
  assert.equal(membership.workspaceAuthority, 'membership')
  assert.equal(membership.supportGrantId, null)
  assert.equal(membership.membershipId, 'mem-1')
  assert.ok(!membership.roleKeys.includes('support'))
}

assert.equal(isSupportGrantActive(null), false)
assert.equal(isSupportGrantActive(activeGrant), true)

console.log('support-workspace.unit: ok')
