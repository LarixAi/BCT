/**
 * Static assert: journey-handlers Type A path uses resolveTenantDb for journey_stops and runs.
 * Run: node scripts/journey-handlers-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/journey-handlers.ts', import.meta.url),
  'utf8',
)

assert.match(src, /resolveTenantDb\(context\.companyId, 'journey_stops', context\)/)
assert.match(src, /resolveTenantDb\(context\.companyId, 'runs', context\)/)
assert.match(src, /resolveTenantDb\(context\.companyId, 'journey_handlers_lookups', context\)/)
assert.match(src, /journeyTenantDb\(context\)[\s\S]*?\.from\('journey_stops'\)/)
assert.match(src, /journeyRunsDb\(context\)[\s\S]*?\.from\('runs'\)/)
assert.doesNotMatch(src, /journeyLookupsDb\(context\)[\s\S]{0,40}\.from\('journey_stops'\)/)
assert.doesNotMatch(src, /journeyLookupsDb\(context\)[\s\S]{0,40}\.from\('runs'\)/)
assert.match(src, /writeImmutableAudit/)
assert.match(src, /emitDomainEvent/)
assert.match(src, /\.eq\('company_id', context\.companyId\)/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)

console.log('journey-handlers-authority.unit.mjs: ok')
