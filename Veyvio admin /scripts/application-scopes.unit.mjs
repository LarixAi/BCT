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
  'operations_manager',
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

function stripApiVersionPrefix(path) {
  const p = normalizeApiPath(path)
  return p.startsWith('v1/') ? p.slice(3) : p
}

function isIntegrationIntakePath(path, method) {
  if (String(method).toUpperCase() !== 'POST') return false
  return stripApiVersionPrefix(path) === 'interests'
}

function isPublicApiPath(path) {
  const p = normalizeApiPath(path)
  if (!p || p === 'health') return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))
}

function requiredScopesForApiPath(path) {
  const p = stripApiVersionPrefix(path)
  if (isPublicApiPath(normalizeApiPath(path))) return null
  if (p.startsWith('platform/')) return ['PLATFORM']
  if (p.startsWith('executive/')) return ['EXECUTIVE']
  if (p.startsWith('finance/')) return ['FINANCE']
  if (p.startsWith('hr/')) return ['HR']
  if (p.startsWith('settings/account-hierarchy')) return ['EXECUTIVE']
  if (p === 'settings/invitations') return ['EXECUTIVE', 'COMMAND']
  if (p.startsWith('driver/')) {
    if (DRIVER_SCOPE_EXEMPT_PREFIXES.some((prefix) => p.startsWith(prefix))) return null
    return ['DRIVER']
  }
  if (p.startsWith('yard/')) return ['YARD', 'COMMAND']
  if (p === 'notifications' || p.startsWith('notifications/')) return ['COMMAND', 'DRIVER']
  if (p === 'interests' || p.startsWith('interests/')) return ['COMMAND']
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
assert.deepEqual(requiredScopesForApiPath('executive/dashboard'), ['EXECUTIVE'])
assert.deepEqual(requiredScopesForApiPath('executive/authorisation'), ['EXECUTIVE'])
assert.deepEqual(requiredScopesForApiPath('finance/costs'), ['FINANCE'])
assert.deepEqual(requiredScopesForApiPath('hr/people'), ['HR'])
assert.deepEqual(requiredScopesForApiPath('settings/account-hierarchy'), ['EXECUTIVE'])
assert.deepEqual(requiredScopesForApiPath('settings/invitations'), ['EXECUTIVE', 'COMMAND'])
assert.deepEqual(requiredScopesForApiPath('vehicles/profiles'), ['COMMAND'])
assert.deepEqual(requiredScopesForApiPath('interests'), ['COMMAND'])
assert.deepEqual(requiredScopesForApiPath('interests/abc'), ['COMMAND'])
assert.deepEqual(requiredScopesForApiPath('v1/interests'), ['COMMAND'])
assert.equal(isIntegrationIntakePath('v1/interests', 'POST'), true)
assert.equal(isIntegrationIntakePath('interests', 'GET'), false)
assert.equal(COMMAND_ROLE_KEYS.has('company_administrator'), true)
assert.equal(COMMAND_ROLE_KEYS.has('operations_manager'), true)
assert.equal(YARD_ROLE_KEYS.has('yard_manager'), true)
assert.equal(scopesSatisfyRequirement(new Set(['COMMAND']), ['YARD', 'COMMAND']), true)
assert.equal(scopesSatisfyRequirement(new Set(['DRIVER']), ['YARD', 'COMMAND']), false)

console.log('application-scopes.unit: ok')
