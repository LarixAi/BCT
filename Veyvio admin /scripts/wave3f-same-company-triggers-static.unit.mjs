/**
 * Static assert: FIX-P1-013 first-wave same-company triggers live in the migration.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sql = await readFile(
  new URL('../supabase/migrations/202608170004_wave3f_same_company_triggers.sql', import.meta.url),
  'utf8',
)

const triggers = [
  'drivers_same_company',
  'duties_same_company',
  'defects_same_company',
  'runs_same_company',
  'trip_assignments_same_company',
  'duty_live_positions_same_company',
  'vehicle_swap_requests_same_company',
  'fuel_records_same_company',
]

for (const trigger of triggers) {
  assert.match(sql, new RegExp(`create trigger ${trigger}`, 'u'), `${trigger} must exist`)
}

assert.match(sql, /private\.trg_assert_company_fks/u)
assert.match(sql, /private\.assert_fk_same_as_anchor/u)
assert.doesNotMatch(sql, /request\.jwt/u, 'must not bind JWT into triggers')

console.log('wave3f-same-company-triggers-static.unit.mjs: ok')
