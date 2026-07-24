import { describe, expect, it } from 'vitest'
import { isTenantScopedQueryKey, tenantKeys } from '@/lib/tenant/tenant-keys'

describe('tenant query keys', () => {
  it('prefixes company id', () => {
    expect(tenantKeys.bookings('co-1', 'all')).toEqual(['company', 'co-1', 'bookings', 'all'])
  })

  it('detects tenant-scoped keys', () => {
    expect(isTenantScopedQueryKey(tenantKeys.drivers('co-1'))).toBe(true)
    expect(isTenantScopedQueryKey(['drivers'])).toBe(false)
  })
})
