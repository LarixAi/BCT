/**
 * Unit checks for offline ops outbox replay classification (no network).
 */
import assert from 'node:assert/strict'

function shouldQueueOnFailure(result) {
  const message = String(result?.message ?? '').toLowerCase()
  if (typeof result?.status === 'number') {
    if (result.status >= 500) return true
    if (result.status === 429) return true
    if (result.status >= 400 && result.status < 500) return false
  }
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout')
  )
}

function isPermanentOpsFailure(result) {
  if (result?.ok) return false
  if (typeof result?.status === 'number') {
    return result.status >= 400 && result.status < 500 && result.status !== 429
  }
  return false
}

function withClientId(input, clientId) {
  return {
    ...(input ?? {}),
    clientId: input?.clientId ?? clientId ?? 'ops-generated',
  }
}

assert.equal(shouldQueueOnFailure({ ok: false, status: 503, message: 'down' }), true)
assert.equal(shouldQueueOnFailure({ ok: false, status: 403, message: 'blocked' }), false)
assert.equal(shouldQueueOnFailure({ ok: false, message: 'network error' }), true)

assert.equal(isPermanentOpsFailure({ ok: false, status: 400, message: 'bad' }), true)
assert.equal(isPermanentOpsFailure({ ok: false, status: 503, message: 'down' }), false)

assert.deepEqual(withClientId({ description: 'mirror' }, 'ops-1'), {
  description: 'mirror',
  clientId: 'ops-1',
})
assert.equal(withClientId({ clientId: 'keep' }, 'ops-1').clientId, 'keep')

console.log('offline-ops-idempotency.unit: ok')
