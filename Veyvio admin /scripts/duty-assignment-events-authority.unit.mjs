/**
 * Static assert: duty_assignment_events Type A path uses resolveTenantDb (ALS/JWT).
 * Run: node scripts/duty-assignment-events-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/duty-publication.ts', import.meta.url),
  'utf8',
)

assert.match(src, /resolveTenantDb\(input\.companyId, 'duty_assignment_events', input\.context\)/)
assert.match(src, /resolveTenantDb\(context\.companyId, 'duty_acknowledgements', context\)/)
assert.match(src, /dutyAssignmentEventsDb\(input\)[\s\S]*?\.from\('duty_assignment_events'\)/)
assert.doesNotMatch(src, /admin[\s\S]{0,40}\.from\('duty_assignment_events'\)/)
assert.match(src, /context\?: RequestContext/)

console.log('duty-assignment-events-authority.unit.mjs: ok')
