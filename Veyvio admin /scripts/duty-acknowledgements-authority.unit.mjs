/**
 * Static assert: duty-publication ack path uses resolveTenantDb for duty_acknowledgements.
 * Duties / duty_runs also use resolveTenantDb helpers (cutovers 51–55).
 * Run: node scripts/duty-acknowledgements-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/duty-publication.ts', import.meta.url),
  'utf8',
)

assert.match(src, /resolveTenantDb\(context\.companyId, 'duty_acknowledgements', context\)/)
assert.match(src, /dutyAckDb\(context\)[\s\S]*?\.from\('duty_acknowledgements'\)/)
assert.doesNotMatch(src, /admin[\s\S]{0,40}\.from\('duty_acknowledgements'\)/)
assert.match(src, /opsTableDb\('duties'/)
assert.match(src, /resolveTenantDb\(/)
assert.match(src, /\.from\('duty_assignment_events'\)/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)
assert.match(src, /\.eq\('company_id', context\.companyId\)/)

console.log('duty-acknowledgements-authority.unit.mjs: ok')
