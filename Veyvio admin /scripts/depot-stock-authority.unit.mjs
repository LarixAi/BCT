/**
 * Static assert: depot-stock Type A path uses UserScopedDb for stock/fuel/transfer/consumable tables.
 * Run: node scripts/depot-stock-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/depot-stock.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(scope\.context, 'depot_stock_items'\)/)
assert.match(src, /workspaceAuthority === 'support'/)
assert.match(src, /companyScopedServiceDb\(scope\.context, 'depot_stock_support_grant'\)/)
assert.match(src, /resolveTenantDb\(companyId, 'depot_stock'\)/)
assert.match(src, /stockTenantDb\(input\.scope\)\.from\('depot_stock_movements'\)/)
assert.match(src, /stockTenantDb\(scope\)[\s\S]*?\.from\('fuel_cards'\)/)
assert.match(src, /stockTenantDb\(scope\)[\s\S]*?\.from\('fuel_card_events'\)/)
assert.match(src, /stockTenantDb\(scope\)[\s\S]*?\.from\('stock_transfers'\)/)
assert.match(src, /stockTenantDb\(scope\)[\s\S]*?\.from\('vehicle_consumable_levels'\)/)
assert.match(src, /depot_stock_side_effects/)
assert.doesNotMatch(src, /stockSideEffectsDb\(scope\)[\s\S]{0,40}\.from\('fuel_card_events'\)/)
assert.doesNotMatch(src, /stockSideEffectsDb\(scope\)[\s\S]{0,40}\.from\('stock_transfers'\)/)
assert.doesNotMatch(src, /stockSideEffectsDb\(scope\)[\s\S]{0,40}\.from\('vehicle_consumable_levels'\)/)
assert.match(src, /\.eq\('company_id', companyId\)/)
assert.match(src, /writeImmutableAudit/)

console.log('depot-stock-authority.unit.mjs: ok')
