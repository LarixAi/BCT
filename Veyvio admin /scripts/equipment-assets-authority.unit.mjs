/**
 * Static assert: equipment-assets Type A path uses UserScopedDb for assets and events.
 * Run: node scripts/equipment-assets-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/equipment-assets.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(scope\.context, 'equipment_assets'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(scope\.context, 'equipment_assets_support_grant'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'equipment_assets'\)/)
assert.match(src, /equipmentTenantDb\(input\.scope\)\.from\('equipment_asset_events'\)/)
assert.match(src, /equipment_assets_side_effects/)
assert.match(src, /\.eq\('company_id', companyId\)/)
assert.match(src, /writeImmutableAudit/)

console.log('equipment-assets-authority.unit.mjs: ok')
