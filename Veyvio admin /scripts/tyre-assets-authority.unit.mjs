/**
 * Static assert: tyre-assets Type A path uses UserScopedDb for assets and events.
 * Run: node scripts/tyre-assets-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/tyre-assets.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(scope\.context, 'tyre_assets'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(scope\.context, 'tyre_assets_support_grant'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'tyre_assets'\)/)
assert.match(src, /tyreTenantDb\(input\.scope\)\.from\('tyre_asset_events'\)/)
assert.match(src, /tyre_assets_side_effects/)
assert.match(src, /\.eq\('company_id', companyId\)/)
assert.match(src, /writeImmutableAudit/)

console.log('tyre-assets-authority.unit.mjs: ok')
