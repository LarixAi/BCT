import { describe, expect, it } from 'vitest'
import {
  canUse,
  deriveTenantStatus,
  isWithinLimit,
  mapSubscriptionStatusToTenant,
  mergeUsageLimits,
  resolveEnabledModules,
} from './index'

describe('@veyvio/entitlements', () => {
  it('canUse soft-opens when modules are empty', () => {
    expect(canUse([], 'yard')).toBe(true)
    expect(canUse(null, 'yard')).toBe(true)
    expect(canUse(['fleet'], 'yard')).toBe(false)
    expect(canUse(['yard'], 'yard')).toBe(true)
  })

  it('maps subscription status to tenant status', () => {
    expect(mapSubscriptionStatusToTenant('past_due')).toBe('READ_ONLY')
    expect(mapSubscriptionStatusToTenant('unpaid')).toBe('SUSPENDED')
    expect(mapSubscriptionStatusToTenant('active')).toBe('ACTIVE')
  })

  it('preserves onboarding tenant status unless billing forces a block', () => {
    expect(
      deriveTenantStatus({
        subscriptionStatus: 'active',
        currentTenantStatus: 'SETUP_REQUIRED',
      }),
    ).toBe('SETUP_REQUIRED')
    expect(
      deriveTenantStatus({
        subscriptionStatus: 'past_due',
        currentTenantStatus: 'SETUP_REQUIRED',
      }),
    ).toBe('READ_ONLY')
  })

  it('resolves modules with overrides', () => {
    const modules = resolveEnabledModules({
      planModules: ['operations', 'fleet'],
      overrides: [{ moduleKey: 'yard', enabled: true }, { moduleKey: 'fleet', enabled: false }],
    })
    expect(modules).toContain('identity')
    expect(modules).toContain('tenancy')
    expect(modules).toContain('operations')
    expect(modules).toContain('yard')
    expect(modules).not.toContain('fleet')
  })

  it('merges usage limits with company overrides', () => {
    const limits = mergeUsageLimits(
      [
        { limitKey: 'drivers', limitValue: 25 },
        { limitKey: 'depots', limitValue: 1 },
      ],
      [{ limitKey: 'drivers', limitValue: 40 }],
    )
    expect(limits.drivers).toBe(40)
    expect(limits.depots).toBe(1)
    expect(isWithinLimit(limits.drivers, 40)).toBe(true)
    expect(isWithinLimit(limits.drivers, 41)).toBe(false)
  })
})
