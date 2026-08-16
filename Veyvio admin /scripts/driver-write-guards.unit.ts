/**
 * Unit checks for driver write guards — imports production request-company-guard.ts.
 */
import assert from 'node:assert/strict'
import { assertRequestCompanyId } from '../supabase/functions/_shared/request-company-guard.ts'

assert.doesNotThrow(() => assertRequestCompanyId('', 'co-a'))
assert.doesNotThrow(() => assertRequestCompanyId(null, 'co-a'))
assert.doesNotThrow(() => assertRequestCompanyId('co-a', 'co-a'))

assert.throws(
  () => assertRequestCompanyId('co-b', 'co-a'),
  (error: { code?: string; message?: string }) =>
    error?.code === 'company_mismatch' || /Company mismatch/i.test(String(error?.message ?? error)),
)

// Forged company id in body must never be accepted against a different JWT company.
assert.throws(() => assertRequestCompanyId('forged-company', 'real-company'))

console.log('driver-write-guards.unit: ok')
