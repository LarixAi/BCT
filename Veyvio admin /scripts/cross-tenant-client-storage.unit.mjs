/**
 * Client-side tenancy key contract (no network).
 * Mirrors driver-workspace-storage.js — keep in sync when key rules change.
 */
import assert from 'node:assert/strict'

function driverWorkspaceStorageKey(companyId, membershipId, suffix) {
  const company = String(companyId ?? '').trim() || '_no_company'
  const membership = String(membershipId ?? '').trim() || '_no_membership'
  return `driver:${company}:${membership}:${suffix}`
}

function bootstrapCacheKey(companyId, depotId) {
  return `${companyId}:${depotId}`
}

const keyA = driverWorkspaceStorageKey('co-a', 'mem-1', 'ops-command-outbox')
const keyB = driverWorkspaceStorageKey('co-b', 'mem-1', 'ops-command-outbox')
assert.notEqual(keyA, keyB, 'different companies must not share driver queue keys')

const cacheA = bootstrapCacheKey('co-a', 'dep-1')
const cacheB = bootstrapCacheKey('co-b', 'dep-1')
assert.notEqual(cacheA, cacheB, 'different companies must not share yard bootstrap cache keys')

console.log('cross-tenant-client-storage.unit: ok')
