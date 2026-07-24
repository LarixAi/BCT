import { describe, expect, it, beforeEach } from 'vitest'
import { getScopedCompanyId, setScopedCompanyId, tKey } from '@/lib/tenant/tenant-query-scope'

describe('tenant-query-scope', () => {
  beforeEach(() => {
    setScopedCompanyId('')
  })

  it('prefixes keys with active company', () => {
    setScopedCompanyId('bct-co')
    expect(tKey(['bookings', 'all'])).toEqual(['company', 'bct-co', 'bookings', 'all'])
  })

  it('uses placeholder when company not selected', () => {
    expect(tKey(['drivers'])[1]).toBe('_none')
  })

  it('tracks scoped company id', () => {
    setScopedCompanyId('veyvio-co')
    expect(getScopedCompanyId()).toBe('veyvio-co')
  })
})
