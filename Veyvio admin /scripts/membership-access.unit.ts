import assert from 'node:assert/strict'
import { decideTenantMembershipAccess } from '../supabase/functions/_shared/membership-access.ts'

assert.deepEqual(
  decideTenantMembershipAccess({
    membership: { id: 'mem-1', status: 'active' },
    hasSupportGrant: false,
  }),
  { allow: true, via: 'membership' },
)

assert.deepEqual(
  decideTenantMembershipAccess({
    membership: { id: 'mem-1', status: 'inactive' },
    hasSupportGrant: false,
  }),
  { allow: false, reason: 'membership_inactive' },
)

assert.deepEqual(
  decideTenantMembershipAccess({
    membership: { id: 'mem-1', status: 'removed' },
    hasSupportGrant: false,
  }),
  { allow: false, reason: 'membership_inactive' },
)

assert.deepEqual(
  decideTenantMembershipAccess({
    membership: null,
    hasSupportGrant: false,
  }),
  { allow: false, reason: 'membership_missing' },
)

assert.deepEqual(
  decideTenantMembershipAccess({
    membership: null,
    hasSupportGrant: true,
  }),
  { allow: true, via: 'support' },
)

assert.deepEqual(
  decideTenantMembershipAccess({
    membership: { id: 'mem-stale', status: 'suspended' },
    hasSupportGrant: true,
  }),
  { allow: true, via: 'support' },
)

console.log('membership-access.unit: ok')
