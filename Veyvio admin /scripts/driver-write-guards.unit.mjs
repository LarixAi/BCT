/**
 * Unit checks for driver write guards — mirrors driver-write-guards.ts.
 */
import assert from 'node:assert/strict'

function assertRequestCompanyId(bodyCompanyId, contextCompanyId) {
  const raw = String(bodyCompanyId ?? '').trim()
  if (raw && raw !== contextCompanyId) {
    const error = new Error('company_mismatch')
    error.code = 'company_mismatch'
    throw error
  }
}

assert.doesNotThrow(() => assertRequestCompanyId('', 'co-a'))
assert.doesNotThrow(() => assertRequestCompanyId('co-a', 'co-a'))
assert.throws(() => assertRequestCompanyId('co-b', 'co-a'), /company_mismatch/)

function guardDriverScopedWriteOrder(body, vehicleId, dutyId) {
  const steps = []
  if (body) {
    assertRequestCompanyId(body.companyId ?? body.company_id, body._contextCompanyId)
    steps.push('company')
  }
  if (dutyId) steps.push('duty')
  if (vehicleId) steps.push('vehicle')
  return steps
}

assert.deepEqual(
  guardDriverScopedWriteOrder({ companyId: 'co-a', _contextCompanyId: 'co-a' }, 'v1', 'd1'),
  ['company', 'duty', 'vehicle'],
)
assert.deepEqual(guardDriverScopedWriteOrder(null, 'v1', ''), ['vehicle'])

console.log('driver-write-guards.unit: ok')
