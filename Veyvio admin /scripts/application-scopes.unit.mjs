/**
 * Unit checks for blueprint Part F application-scope path rules (no network).
 * Mirrors application-scopes.ts — keep in sync when path rules change.
 */
import assert from 'node:assert/strict'

const YARD_ROLE_KEYS = new Set(['yard_manager', 'yard_operative', 'contractor'])
const COMMAND_ROLE_KEYS = new Set([
  'company_owner',
  'company_administrator',
  'transport_manager',
  'dispatcher',
  'compliance_manager',
  'safeguarding_lead',
  'read_only_auditor',
  'support',
])
const DRIVER_SCOPE_EXEMPT_PREFIXES = ['driver/onboarding', 'driver/profile', 'driver/devices']
const PUBLIC_PATH_PREFIXES = ['auth/', 'system/', 'health']

function normalizeApiPath(path) {
  return path.replace(/^\/+|\/+$/g, '')
}

function isPublicApiPath(path) {
  const p = normalizeApiPath(path)
  if (!p || p === 'health') return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))
}

function requiredScopesForApiPath(path) {
  const p = normalizeApiPath(path)
  if (isPublicApiPath(p)) return null
  if (p.startsWith('platform/')) return ['PLATFORM']
  if (p.startsWith('driver/')) {
    if (DRIVER_SCOPE_EXEMPT_PREFIXES.some((prefix) => p.startsWith(prefix))) return null
    return ['DRIVER']
  }
  if (p.startsWith('yard/')) return ['YARD', 'COMMAND']
  if (p === 'notifications' || p.startsWith('notifications/')) return ['COMMAND', 'DRIVER']
  return ['COMMAND']
}

function scopesSatisfyRequirement(granted, required) {
  if (required.includes('PLATFORM')) return granted.has('PLATFORM')
  return required.some((scope) => granted.has(scope))
}

assert.equal(normalizeApiPath('/driver/bootstrap/'), 'driver/bootstrap')
assert.equal(isPublicApiPath('auth/login'), true)
assert.equal(requiredScopesForApiPath('auth/login'), null)
assert.deepEqual(requiredScopesForApiPath('driver/bootstrap'), ['DRIVER'])
assert.deepEqual(requiredScopesForApiPath('yard/hub'), ['YARD', 'COMMAND'])
assert.deepEqual(requiredScopesForApiPath('notifications'), ['COMMAND', 'DRIVER'])
assert.deepEqual(requiredScopesForApiPath('notifications/unread-count'), ['COMMAND', 'DRIVER'])
assert.deepEqual(requiredScopesForApiPath('vehicles/profiles'), ['COMMAND'])
assert.equal(COMMAND_ROLE_KEYS.has('company_administrator'), true)
assert.equal(YARD_ROLE_KEYS.has('yard_manager'), true)
assert.equal(scopesSatisfyRequirement(new Set(['COMMAND']), ['YARD', 'COMMAND']), true)
assert.equal(scopesSatisfyRequirement(new Set(['DRIVER']), ['YARD', 'COMMAND']), false)

console.log('application-scopes.unit: ok')
