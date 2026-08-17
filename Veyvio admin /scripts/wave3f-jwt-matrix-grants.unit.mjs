/**
 * Static assert: Wave 3F JWT matrix GRANT alignment lives in the migration.
 * Run: node scripts/wave3f-jwt-matrix-grants.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sql = await readFile(
  new URL('../supabase/migrations/202608170002_wave3f_jwt_matrix_grants.sql', import.meta.url),
  'utf8',
)

const tables = [
  'equipment_assets',
  'equipment_asset_events',
  'tyre_assets',
  'tyre_asset_events',
  'depot_stock_items',
  'depot_stock_movements',
  'purchase_requests',
]

for (const table of tables) {
  assert.match(sql, new RegExp(`public\\.${table}`, 'u'), `${table} must be listed`)
}

assert.match(sql, /grant select on table[\s\S]+to authenticated/u)
assert.match(sql, /grant all on table[\s\S]+to service_role/u)
assert.doesNotMatch(
  sql,
  /grant (insert|update|delete|all) on table[\s\S]+to authenticated/u,
  'authenticated must not receive write grants on fleet resource tables',
)

console.log('wave3f-jwt-matrix-grants.unit.mjs: ok')
