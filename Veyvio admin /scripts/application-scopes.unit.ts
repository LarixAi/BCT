/**
 * Unit checks for blueprint Part F application-scope path rules (no network).
 * Imports production application-scope-paths.ts — do not reimplement path rules here.
 */
import assert from 'node:assert/strict'
import {
  isIntegrationIntakePath,
  isPublicApiPath,
  normalizeApiPath,
  requiredScopesForApiPath,
  roleGrantsCommandScope,
  roleGrantsYardScope,
  scopesSatisfyRequirement,
} from '../supabase/functions/_shared/application-scope-paths.ts'

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
assert.equal(roleGrantsCommandScope('company_administrator'), true)
assert.equal(roleGrantsCommandScope('operations_manager'), true)
assert.equal(roleGrantsYardScope('yard_manager'), true)
assert.equal(scopesSatisfyRequirement(new Set(['COMMAND']), ['YARD', 'COMMAND']), true)
assert.equal(scopesSatisfyRequirement(new Set(['DRIVER']), ['YARD', 'COMMAND']), false)

console.log('application-scopes.unit: ok')
