/**
 * Client-side tenancy key contract (no network).
 * Must match veyvio-driver-App/src/lib/driver-workspace-storage.js fail-closed behaviour.
 * Soft `_no_company` / `_no_membership` keys are forbidden.
 */
import assert from 'node:assert/strict'

function driverWorkspaceStorageKey(companyId, membershipId, suffix) {
  const company = String(companyId ?? '').trim()
  const membership = String(membershipId ?? '').trim()
  if (!company || !membership) {
    const error = new Error('Company and membership context is required before saving offline work.')
    error.code = 'OFFLINE_CONTEXT_NOT_READY'
    throw error
  }
  return `driver:${company}:${membership}:${suffix}`
}

function bootstrapCacheKey(companyId, depotId) {
  return `${companyId}:${depotId}`
}

const keyA = driverWorkspaceStorageKey('co-a', 'mem-1', 'ops-command-outbox')
const keyB = driverWorkspaceStorageKey('co-b', 'mem-1', 'ops-command-outbox')
assert.notEqual(keyA, keyB, 'different companies must not share driver queue keys')

assert.throws(() => driverWorkspaceStorageKey('', 'mem-1', 'ops'), (error) => error.code === 'OFFLINE_CONTEXT_NOT_READY')
assert.throws(() => driverWorkspaceStorageKey('co-a', '', 'ops'), (error) => error.code === 'OFFLINE_CONTEXT_NOT_READY')
assert.throws(() => driverWorkspaceStorageKey(null, null, 'ops'), (error) => error.code === 'OFFLINE_CONTEXT_NOT_READY')

const cacheA = bootstrapCacheKey('co-a', 'dep-1')
const cacheB = bootstrapCacheKey('co-b', 'dep-1')
assert.notEqual(cacheA, cacheB, 'different companies must not share yard bootstrap cache keys')

console.log('cross-tenant-client-storage.unit: ok')
