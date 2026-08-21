/**
 * Static assert: duty/trip hubs no longer import bare admin.
 * Run: node scripts/duty-trip-hubs-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

for (const file of [
  'duty-publication.ts',
  'operational-trip-assign.ts',
  'projections.ts',
]) {
  const src = await readFile(
    new URL(`../supabase/functions/_shared/${file}`, import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/, `${file} must not import admin`)
}

const duty = await readFile(
  new URL('../supabase/functions/_shared/duty-publication.ts', import.meta.url),
  'utf8',
)
assert.match(duty, /opsTableDb\('duties'/)
assert.match(duty, /opsSideEffectsDb\(context\.companyId\)\.from\('duty_runs'\)\.delete/)

const trip = await readFile(
  new URL('../supabase/functions/_shared/operational-trip-assign.ts', import.meta.url),
  'utf8',
)
assert.match(trip, /opsTableDb\('trip_assignments'|opsTableDb\('duties'|opsTableDb\('runs'/)

const proj = await readFile(
  new URL('../supabase/functions/_shared/projections.ts', import.meta.url),
  'utf8',
)
assert.match(proj, /resolveProjectionDb\(companyId, 'projections_read'\)/)
assert.doesNotMatch(proj, /companyScopedServiceDbForCompany\(companyId, 'projections_read'\)/)
assert.match(duty, /resolveTenantDb\(/)

console.log('duty-trip-hubs-authority.unit.mjs: ok')
