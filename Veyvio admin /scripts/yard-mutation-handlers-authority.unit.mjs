/**
 * Static assert: yard-mutation-handlers Type A path uses UserScopedDb for
 * defects, yard_movements, and vor_cases. Vehicles and audit_events stay service-role.
 * Run: node scripts/yard-mutation-handlers-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/yard-mutation-handlers.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(context, table\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(context, 'yard_mutation_handlers_support_grant'\)/)
assert.match(src, /companyScopedServiceDb\(context, 'yard_mutation_handlers_side_effects'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'yard_mutation_handlers_side_effects'\)/)
assert.match(src, /yardTenantDb\(context, 'defects'\)[\s\S]*?\.from\('defects'\)/)
assert.match(src, /yardTenantDb\(context, 'yard_movements'\)[\s\S]*?\.from\('yard_movements'\)/)
assert.match(src, /yardTenantDb\(context, 'vor_cases'\)[\s\S]*?\.from\('vor_cases'\)/)
assert.doesNotMatch(src, /yardSideEffectsDb\(context\)[\s\S]{0,40}\.from\('defects'\)/)
assert.doesNotMatch(src, /yardSideEffectsDb\(context\)[\s\S]{0,40}\.from\('yard_movements'\)/)
assert.doesNotMatch(src, /yardSideEffectsDb\(context\)[\s\S]{0,40}\.from\('vor_cases'\)/)
assert.match(src, /yardSideEffectsDb\(input\.context\)[\s\S]*?\.from\('audit_events'\)/)
assert.match(src, /\.eq\('company_id', context\.companyId\)/)

console.log('yard-mutation-handlers-authority.unit.mjs: ok')
