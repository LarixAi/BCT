/**
 * Static assert: operational-exceptions Type A path uses UserScopedDb for cases and events.
 * Run: node scripts/operational-exceptions-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/operational-exceptions.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(scope\.context, 'operational_exceptions'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(scope\.context, 'operational_exceptions_support_grant'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'operational_exceptions'\)/)
assert.match(src, /exceptionTenantDb\(input\.scope\)\.from\('operational_exception_events'\)/)
assert.match(src, /exceptionTenantDb\(scope\)[\s\S]*?\.from\('operational_exception_events'\)/)
assert.match(src, /operational_exception_side_effects/)
assert.doesNotMatch(src, /exceptionSideEffectsDb\(input\.scope\)\.from\('operational_exception_events'\)/)
assert.match(src, /\.eq\('company_id', companyId\)/)
assert.match(src, /writeImmutableAudit/)

console.log('operational-exceptions-authority.unit.mjs: ok')
