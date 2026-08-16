/**
 * Wave 3B regression matrix — production decideExplicitApplicationScopes helper.
 */
import assert from 'node:assert/strict'
import {
  appsInferredFromRolesForBackfill,
  decideExplicitApplicationScopes,
} from '../supabase/functions/_shared/explicit-application-scopes.ts'
import { requiredScopesForApiPath, scopesSatisfyRequirement } from '../supabase/functions/_shared/application-scope-paths.ts'

function sorted(set: Set<string>) {
  return [...set].sort()
}

// 1) Active membership + no explicit grants => ZERO protected app scopes
assert.deepEqual(
  sorted(
    decideExplicitApplicationScopes({
      companyId: 'co-a',
      membershipId: 'mem-1',
      explicitAppTypes: [],
    }),
  ),
  [],
)

// 2) company_owner role is irrelevant — no COMMAND/YARD from role
assert.deepEqual(
  sorted(
    decideExplicitApplicationScopes({
      companyId: 'co-a',
      membershipId: 'mem-owner',
      explicitAppTypes: [],
      // role keys are intentionally not accepted by the decision API
    }),
  ),
  [],
)

// 3) platform JWT + company context + no explicit grant => PLATFORM only
assert.deepEqual(
  sorted(
    decideExplicitApplicationScopes({
      platformRole: 'platform_admin',
      companyId: 'co-a',
      membershipId: 'mem-1',
      explicitAppTypes: [],
    }),
  ),
  ['PLATFORM'],
)
assert.equal(
  scopesSatisfyRequirement(
    decideExplicitApplicationScopes({
      platformRole: 'platform_admin',
      companyId: 'co-a',
      membershipId: 'mem-1',
      explicitAppTypes: [],
    }),
    requiredScopesForApiPath('vehicles/profiles') ?? [],
  ),
  false,
)

// 4) explicit DRIVER only
{
  const granted = decideExplicitApplicationScopes({
    companyId: 'co-a',
    membershipId: 'mem-drv',
    explicitAppTypes: ['DRIVER'],
  })
  assert.deepEqual(sorted(granted), ['DRIVER'])
  assert.equal(scopesSatisfyRequirement(granted, requiredScopesForApiPath('driver/bootstrap') ?? []), true)
  assert.equal(scopesSatisfyRequirement(granted, requiredScopesForApiPath('vehicles/profiles') ?? []), false)
  assert.equal(scopesSatisfyRequirement(granted, requiredScopesForApiPath('yard/hub') ?? []), false)
}

// 5) explicit COMMAND only
{
  const granted = decideExplicitApplicationScopes({
    companyId: 'co-a',
    membershipId: 'mem-cmd',
    explicitAppTypes: ['COMMAND'],
  })
  assert.deepEqual(sorted(granted), ['COMMAND'])
  assert.equal(scopesSatisfyRequirement(granted, requiredScopesForApiPath('vehicles/profiles') ?? []), true)
  assert.equal(scopesSatisfyRequirement(granted, requiredScopesForApiPath('yard/hub') ?? []), true)
  assert.equal(scopesSatisfyRequirement(granted, requiredScopesForApiPath('driver/bootstrap') ?? []), false)
}

// 6) forged client application/scopes ignored
assert.deepEqual(
  sorted(
    decideExplicitApplicationScopes({
      companyId: 'co-a',
      membershipId: 'mem-1',
      explicitAppTypes: [],
      clientClaimedApps: ['COMMAND', 'YARD', 'EXECUTIVE', 'DRIVER'],
    }),
  ),
  [],
)

// 7) removed/inactive membership context (no membershipId) + historic grant rows ignored
assert.deepEqual(
  sorted(
    decideExplicitApplicationScopes({
      companyId: 'co-a',
      membershipId: '',
      explicitAppTypes: ['COMMAND', 'EXECUTIVE'],
    }),
  ),
  [],
)

// 8) active explicit support grant path only
assert.deepEqual(
  sorted(
    decideExplicitApplicationScopes({
      isSupportSession: true,
      companyId: 'co-a',
      membershipId: '',
      explicitAppTypes: ['DRIVER'], // membership grants must not widen support path
      clientClaimedApps: ['EXECUTIVE'],
    }),
  ),
  ['COMMAND', 'YARD'],
)

// Backfill mapping remains available for migration parity checks (not runtime auth).
assert.deepEqual(sorted(appsInferredFromRolesForBackfill(['company_owner'])), ['COMMAND', 'EXECUTIVE'])
assert.deepEqual(sorted(appsInferredFromRolesForBackfill(['transport_manager'])), ['COMMAND'])
assert.deepEqual(sorted(appsInferredFromRolesForBackfill(['driver'])), ['DRIVER'])

console.log('explicit-application-scopes.unit: ok')
