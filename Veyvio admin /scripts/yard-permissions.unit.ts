/**
 * Wave 3D — Yard multi-role authorization regression matrix.
 * Imports the production helper (no mirrored copies).
 */
import assert from 'node:assert/strict'
import {
  decideYardActionAuthorization,
  resolveYardEffectivePermissions,
  yardPermissionForMutationType,
  yardPermissionsForRole,
  yardPermissionsForRoles,
} from '../supabase/functions/_shared/yard-permissions.ts'

function decisionEqual(a: ReturnType<typeof decideYardActionAuthorization>, b: ReturnType<typeof decideYardActionAuthorization>) {
  assert.equal(a.allowed, b.allowed)
  assert.equal(a.reason, b.reason)
  assert.deepEqual(a.effectivePermissions, b.effectivePermissions)
  assert.deepEqual([...a.authoritativeRoleKeys].sort(), [...b.authoritativeRoleKeys].sort())
}

// Single-role matrix still deny-by-default for unmapped roles
assert.ok(yardPermissionsForRole('yard_manager').includes('vehicle.mark_vor'))
assert.ok(yardPermissionsForRole('yard_operative').includes('vehicle.move'))
assert.ok(!yardPermissionsForRole('yard_operative').includes('vehicle.mark_vor'))
assert.deepEqual(yardPermissionsForRole('read_only_auditor').sort(), ['audit.view', 'plan.view', 'vehicle.view'])
assert.deepEqual(yardPermissionsForRole('driver'), [])
assert.deepEqual(yardPermissionsForRole(''), [])
assert.deepEqual(yardPermissionsForRole('forged_yard_manager'), [])

// Order-independence: driver + yard_manager
{
  const forward = yardPermissionsForRoles(['driver', 'yard_manager'])
  const reverse = yardPermissionsForRoles(['yard_manager', 'driver'])
  assert.deepEqual(forward, reverse)
  assert.ok(forward.includes('vehicle.mark_vor'))
  assert.ok(forward.includes('vehicle.move'))

  const allowForward = decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['driver', 'yard_manager'],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.mark_vor',
  })
  const allowReverse = decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['yard_manager', 'driver'],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.mark_vor',
  })
  assert.equal(allowForward.allowed, true)
  decisionEqual(allowForward, allowReverse)
}

// Order-independence: read_only_auditor + yard_operative → operative actions
{
  const forward = decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['read_only_auditor', 'yard_operative'],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.move',
  })
  const reverse = decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['yard_operative', 'read_only_auditor'],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.move',
  })
  assert.equal(forward.allowed, true)
  decisionEqual(forward, reverse)
  // Restrictive auditor must not strip operative move
  assert.ok(forward.effectivePermissions.includes('vehicle.move'))
  // Operative still cannot mark VOR
  assert.equal(
    decideYardActionAuthorization({
      workspaceAuthority: 'membership',
      roleKeys: ['read_only_auditor', 'yard_operative'],
      applicationScopes: ['YARD'],
      requiredPermission: 'vehicle.mark_vor',
    }).allowed,
    false,
  )
}

// Roles with no Yard authority => denied
assert.equal(
  decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['driver', 'escort'],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.view',
  }).allowed,
  false,
)

// Empty roles + no permission => denied
assert.equal(
  decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: [],
    explicitPermissions: [],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.view',
  }).allowed,
  false,
)

// Forged client yard_manager => ignored
{
  const forged = decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['driver'],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.mark_vor',
    clientClaimedRoleKeys: ['yard_manager'],
  })
  assert.equal(forged.allowed, false)
  assert.equal(forged.reason, 'missing_permission')
  assert.ok(!forged.effectivePermissions.includes('vehicle.mark_vor'))
}

// Explicit YARD app grant + unauthorized roles => denied
assert.equal(
  decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['driver'],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.move',
  }).allowed,
  false,
)

// Authorized Yard role + no explicit app grant => denied
{
  const noApp = decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['yard_manager'],
    applicationScopes: [],
    requiredPermission: 'vehicle.mark_vor',
  })
  assert.equal(noApp.allowed, false)
  assert.equal(noApp.reason, 'missing_application_scope')
}

// COMMAND scope also satisfies app prerequisite (oversight)
assert.equal(
  decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['yard_manager'],
    applicationScopes: ['COMMAND'],
    requiredPermission: 'vehicle.mark_vor',
  }).allowed,
  true,
)

// Support workspace => support policy, not membership role array
{
  const support = decideYardActionAuthorization({
    workspaceAuthority: 'support',
    roleKeys: ['driver', 'read_only_auditor'],
    applicationScopes: ['COMMAND', 'YARD'],
    requiredPermission: 'vehicle.mark_vor',
    clientClaimedRoleKeys: ['yard_operative'],
  })
  assert.equal(support.allowed, true)
  assert.deepEqual(support.authoritativeRoleKeys, ['support'])
  assert.ok(support.effectivePermissions.includes('vehicle.mark_vor'))

  const supportNoApp = decideYardActionAuthorization({
    workspaceAuthority: 'support',
    roleKeys: ['support'],
    applicationScopes: [],
    requiredPermission: 'vehicle.view',
  })
  assert.equal(supportNoApp.allowed, false)
  assert.equal(supportNoApp.reason, 'missing_application_scope')
}

// Explicit permissions union with roles
assert.equal(
  decideYardActionAuthorization({
    workspaceAuthority: 'membership',
    roleKeys: ['driver'],
    explicitPermissions: ['vehicle.move'],
    applicationScopes: ['YARD'],
    requiredPermission: 'vehicle.move',
  }).allowed,
  true,
)

// Hub projection order-independence
assert.deepEqual(
  resolveYardEffectivePermissions({
    workspaceAuthority: 'membership',
    roleKeys: ['driver', 'yard_manager'],
  }),
  resolveYardEffectivePermissions({
    workspaceAuthority: 'membership',
    roleKeys: ['yard_manager', 'driver'],
  }),
)

assert.equal(yardPermissionForMutationType('vehicle.move'), 'vehicle.move')
assert.equal(yardPermissionForMutationType('inspection.approve'), 'check.override')

console.log('yard-permissions.unit: ok')
